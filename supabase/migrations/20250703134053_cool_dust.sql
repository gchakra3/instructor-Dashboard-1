/*
  # Fix User Data Consistency

  1. Fixes
    - Ensure profiles table exists and has correct structure
    - Create missing profiles for existing users
    - Fix incorrect foreign key references
    - Ensure admin functions use correct syntax
    - Ensure all users have default roles assigned
    - Re-register triggers for profile creation and role assignment

  2. Security
    - Maintain RLS policies
    - Fix any incorrect policy definitions

  3. Data Integrity
    - Populate missing profile records
    - Ensure admin users have correct roles
    - Fix inconsistent foreign key references
*/

-- Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  bio text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Ensure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Check if RLS policies exist on profiles, create them if they don't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile"
          ON profiles FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile"
          ON profiles FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile"
          ON profiles FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create trigger to keep updated_at current
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure the updated_at column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create profiles for existing users
CREATE OR REPLACE FUNCTION sync_missing_profiles()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT 
            u.id, 
            u.email, 
            u.raw_user_meta_data->>'full_name' as full_name
        FROM 
            auth.users u
        LEFT JOIN 
            profiles p ON u.id = p.user_id
        WHERE 
            p.id IS NULL
    LOOP
        INSERT INTO profiles (
            user_id, 
            email, 
            full_name
        ) 
        VALUES (
            user_record.id, 
            user_record.email, 
            COALESCE(user_record.full_name, user_record.email)
        );
        
        RAISE NOTICE 'Created missing profile for user: %', user_record.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create missing profiles
SELECT sync_missing_profiles();

-- Fix the is_admin function to use proper auth.email() function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email()
  );
END;
$$;

-- Fix bookings table foreign key reference to use auth.users directly
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Create newsletter_subscribers table if it doesn't exist
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  status text DEFAULT 'active'
);

-- Enable RLS on newsletter_subscribers if not already enabled
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Check if RLS policy exists on newsletter_subscribers, create if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'newsletter_subscribers' AND policyname = 'Anyone can subscribe to newsletter'
    ) THEN
        CREATE POLICY "Anyone can subscribe to newsletter"
          ON newsletter_subscribers
          FOR INSERT
          TO public
          WITH CHECK (true);
    END IF;
END $$;

-- Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate on_auth_user_created trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert admin user if not exists
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- Populate form_submissions table if it exists but doesn't have data from bookings
DO $$
DECLARE
  form_submissions_exists BOOLEAN;
BEGIN
  -- Check if form_submissions table exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'form_submissions'
  ) INTO form_submissions_exists;

  IF form_submissions_exists THEN
    -- Populate form_submissions with booking data if no booking submissions exist
    IF (SELECT COUNT(*) FROM form_submissions WHERE type = 'booking') = 0 THEN
      INSERT INTO form_submissions (type, data, user_email, user_name, created_at)
      SELECT 
        'booking'::submission_type,
        jsonb_build_object(
          'class_name', class_name,
          'instructor', instructor,
          'class_date', class_date,
          'class_time', class_time,
          'experience_level', experience_level,
          'special_requests', special_requests,
          'status', status
        ),
        email,
        first_name || ' ' || last_name,
        created_at
      FROM 
        bookings
      WHERE 
        created_at > (CURRENT_DATE - INTERVAL '30 days');
    END IF;
  END IF;
END $$;

-- Verify and fix the check_is_admin function
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email()
  );
END;
$$;

-- Ensure roles table exists
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Check if RLS policies exist on roles, create them if they don't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'Anyone can read roles'
    ) THEN
        CREATE POLICY "Anyone can read roles"
          ON roles
          FOR SELECT
          TO anon, authenticated
          USING (true);
    END IF;
END $$;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('user', 'Regular platform user'),
  ('instructor', 'Yoga instructor'),
  ('admin', 'Platform administrator'),
  ('super_admin', 'Super administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Verify and fix the user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Check if RLS policies exist on user_roles, create them if they don't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can read their own roles'
    ) THEN
        CREATE POLICY "Users can read their own roles"
          ON user_roles
          FOR SELECT
          TO authenticated
          USING (user_id = auth.uid());
    END IF;
END $$;

-- Create function to assign default role to users
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the ID of the 'user' role
  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.user_id, r.id
  FROM roles r
  WHERE r.name = 'user'
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for default role assignment
DROP TRIGGER IF EXISTS assign_default_role_trigger ON profiles;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_default_role();

-- Assign default role to any users that don't have it already
WITH user_without_roles AS (
  SELECT p.user_id
  FROM profiles p
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE ur.user_id IS NULL
)
INSERT INTO user_roles (user_id, role_id)
SELECT uwr.user_id, r.id
FROM user_without_roles uwr
CROSS JOIN roles r
WHERE r.name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Create a check function for more detailed debugging
CREATE OR REPLACE FUNCTION debug_user_data()
RETURNS TABLE (
  auth_users_count INTEGER,
  profiles_count INTEGER,
  user_roles_count INTEGER,
  admin_users_count INTEGER,
  missing_profiles_count INTEGER,
  missing_roles_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users)::INTEGER AS auth_users_count,
    (SELECT COUNT(*) FROM profiles)::INTEGER AS profiles_count,
    (SELECT COUNT(*) FROM user_roles)::INTEGER AS user_roles_count,
    (SELECT COUNT(*) FROM admin_users)::INTEGER AS admin_users_count,
    (SELECT COUNT(*) FROM auth.users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.id IS NULL)::INTEGER AS missing_profiles_count,
    (SELECT COUNT(*) FROM profiles p LEFT JOIN user_roles ur ON p.user_id = ur.user_id WHERE ur.user_id IS NULL)::INTEGER AS missing_roles_count;
END;
$$;

-- Run the debug function to check the current state
SELECT * FROM debug_user_data();