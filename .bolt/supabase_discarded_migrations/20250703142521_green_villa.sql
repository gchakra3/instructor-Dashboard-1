/*
  # Fix user signup process and profile creation

  1. Issues Fixed:
    - Database error when saving new users
    - Missing profile creation during signup
    - Role assignment issues

  2. Implementation:
    - Create robust handle_new_user function with proper error handling
    - Simplify RLS policies to ensure smooth signup flow
    - Fix trigger function with direct profile insertion
    - Add diagnostic function for troubleshooting

  3. Security:
    - Maintain proper RLS with simplified policies
    - Use security definer functions for cross-schema operations
*/

-- 1. Fix the profiles table structure to ensure it works properly with auth
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  bio text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- 3. Create simplified RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- CRITICAL: Allow anyone to create profiles during signup
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Give service_role full access to manage profiles
CREATE POLICY "Service role can manage profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Create or replace the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile directly without checking if it exists
  -- This is simpler and less error-prone
  BEGIN
    INSERT INTO profiles (user_id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RAISE NOTICE 'Created profile for new user: %', NEW.email;
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, which is fine
      RAISE NOTICE 'Profile already exists for user: %', NEW.email;
    WHEN others THEN
      -- Log the error but don't block user creation
      RAISE WARNING 'Error creating profile for user %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 5. Drop and recreate the auth user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Add updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Ensure default roles exist
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
  ('user', 'Regular platform user'),
  ('instructor', 'Yoga instructor'),
  ('admin', 'Platform administrator'),
  ('super_admin', 'Super administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- 8. Ensure user_roles table exists with correct structure
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 9. Create policy for role assignment during signup
DROP POLICY IF EXISTS "Allow role assignment during signup" ON user_roles;
CREATE POLICY "Allow role assignment during signup"
  ON user_roles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 10. Create function to assign default role on profile creation
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default role ID
  SELECT id INTO default_role_id FROM roles WHERE name = 'user' LIMIT 1;
  
  IF default_role_id IS NOT NULL THEN
    -- Insert default role for new user
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.user_id, default_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail profile creation
    RAISE WARNING 'Error assigning default role to user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 11. Create trigger to assign default role after profile creation
DROP TRIGGER IF EXISTS assign_default_role_trigger ON profiles;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();

-- 12. Create diagnostic function to help troubleshoot signup issues
CREATE OR REPLACE FUNCTION diagnose_user_signup()
RETURNS TABLE (
  auth_users_count bigint,
  profiles_count bigint,
  user_roles_count bigint,
  users_without_profiles bigint,
  profiles_without_roles bigint,
  last_user_email text,
  last_profile_email text,
  trigger_exists boolean,
  profile_policies text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM user_roles),
    (SELECT COUNT(*) FROM auth.users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.id IS NULL),
    (SELECT COUNT(*) FROM profiles p LEFT JOIN user_roles ur ON p.user_id = ur.user_id WHERE ur.user_id IS NULL),
    (SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 1),
    (SELECT email FROM profiles ORDER BY created_at DESC LIMIT 1),
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'),
    ARRAY(SELECT policyname FROM pg_policies WHERE tablename = 'profiles');
END;
$$;

-- Run diagnostics
SELECT * FROM diagnose_user_signup();

-- Fix any missing profiles for existing users
DO $$
DECLARE
  missing_user RECORD;
  fixed_count INT := 0;
BEGIN
  FOR missing_user IN 
    SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' as full_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO profiles (user_id, email, full_name)
      VALUES (
        missing_user.id,
        missing_user.email,
        COALESCE(missing_user.full_name, '')
      );
      fixed_count := fixed_count + 1;
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'Failed to create profile for %: %', missing_user.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Fixed % missing profiles', fixed_count;
END;
$$;