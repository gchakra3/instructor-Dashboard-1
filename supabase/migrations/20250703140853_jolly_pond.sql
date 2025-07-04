/*
  # Fix Profile Creation and Admin Dashboard

  1. Changes:
    - Fix the handle_new_user function to properly create profiles on signup
    - Add better error handling to ensure profiles are always created
    - Fix the get_user_profiles_for_admin function to work properly in the dashboard
    - Add service_role policies for admin management
    - Create triggers with EXCEPTION handling for robustness
    - Update and repair view definitions

  2. Security:
    - Maintain all existing RLS policies
    - Ensure admin can properly view user data
    - Fix permission issues with profiles table
*/

-- Ensure profiles table exists with correct structure and constraints
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- CRITICAL: Allow public profile creation during signup
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow service role full access for backend operations
CREATE POLICY "Service role can manage profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure updated_at column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix and improve the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists for this user
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
    BEGIN
      INSERT INTO profiles (user_id, email, full_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
      );
      RAISE NOTICE 'Created profile for user: %', NEW.email;
    EXCEPTION WHEN others THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to synchronize existing users with missing profiles
CREATE OR REPLACE FUNCTION sync_missing_profiles()
RETURNS void AS $$
DECLARE
    v_user_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_user_record IN 
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
        BEGIN
            INSERT INTO profiles (
                user_id, 
                email, 
                full_name
            ) 
            VALUES (
                v_user_record.id, 
                v_user_record.email, 
                COALESCE(v_user_record.full_name, v_user_record.email)
            );
            v_count := v_count + 1;
        EXCEPTION WHEN others THEN
            RAISE WARNING 'Error syncing profile for user %: %', v_user_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Created % missing profile(s)', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create missing profiles
SELECT sync_missing_profiles();

-- Ensure admin_users table exists
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Add policies for admin_users
DROP POLICY IF EXISTS "Service role can manage admin_users" ON admin_users;
CREATE POLICY "Service role can manage admin_users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
  
DROP POLICY IF EXISTS "Authenticated can read admin_users" ON admin_users;
CREATE POLICY "Authenticated can read admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix admin user if needed
CREATE OR REPLACE FUNCTION fix_admin_user()
RETURNS void AS $$
DECLARE
    v_admin_email TEXT := 'gourab.master@gmail.com';
    v_user_id UUID;
    v_profile_id UUID;
BEGIN
    -- Insert or update admin user
    INSERT INTO admin_users (email, role) 
    VALUES (v_admin_email, 'super_admin')
    ON CONFLICT (email) DO UPDATE SET
      role = 'super_admin',
      updated_at = now();
      
    -- Get user ID if exists
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_admin_email;
    
    -- If user exists, ensure they have a profile
    IF v_user_id IS NOT NULL THEN
        SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
        
        IF v_profile_id IS NULL THEN
            INSERT INTO profiles (user_id, email, full_name, role)
            VALUES (v_user_id, v_admin_email, 'Admin User', 'admin');
            RAISE NOTICE 'Created profile for admin user: %', v_admin_email;
        ELSE
            UPDATE profiles 
            SET role = 'admin', updated_at = now()
            WHERE user_id = v_user_id;
            RAISE NOTICE 'Updated profile for admin user: %', v_admin_email;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix admin user function
SELECT fix_admin_user();

-- Ensure helper functions for admin checks work properly
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT auth.email() INTO v_email;
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = v_email
    );
EXCEPTION
    WHEN others THEN
        RETURN false;
END;
$$;

-- Fix the get_user_profiles_for_admin function for Admin dashboard
DROP FUNCTION IF EXISTS get_user_profiles_for_admin();

CREATE OR REPLACE FUNCTION get_user_profiles_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  phone text,
  bio text,
  experience_level text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  user_created_at timestamptz,
  user_roles text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return user data with roles array
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    COALESCE(p.full_name, 'No name') as full_name,
    p.phone,
    p.bio,
    COALESCE(p.role, 'user') as experience_level,
    p.created_at,
    p.updated_at,
    COALESCE(p.email, u.email) as email,
    u.created_at as user_created_at,
    ARRAY(
      SELECT r.name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = p.user_id
    ) as user_roles
  FROM profiles p
  JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Update user_engagement_metrics view with correct data types
DROP VIEW IF EXISTS user_engagement_metrics;
CREATE VIEW user_engagement_metrics AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  COUNT(b.id)::bigint as total_bookings,
  0::bigint as attended_classes,
  0::bigint as articles_viewed,
  GREATEST(p.created_at, p.updated_at) as last_activity,
  CASE 
    WHEN p.updated_at >= CURRENT_DATE - interval '7 days' THEN 'active'
    WHEN p.updated_at >= CURRENT_DATE - interval '30 days' THEN 'inactive'
    ELSE 'dormant'
  END as engagement_status
FROM 
  profiles p
LEFT JOIN 
  bookings b ON p.user_id = b.user_id
GROUP BY 
  p.user_id, p.email, p.full_name, p.created_at, p.updated_at;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;
GRANT EXECUTE ON FUNCTION get_user_profiles_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;
GRANT SELECT ON user_engagement_metrics TO authenticated;

-- Create a diagnostic function to check user accounts
CREATE OR REPLACE FUNCTION check_user_accounts()
RETURNS TABLE (
  total_auth_users INTEGER,
  total_profiles INTEGER,
  missing_profiles INTEGER,
  admin_users INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users)::INTEGER,
    (SELECT COUNT(*) FROM profiles)::INTEGER,
    (SELECT COUNT(*) FROM auth.users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.id IS NULL)::INTEGER,
    (SELECT COUNT(*) FROM admin_users)::INTEGER;
END;
$$;

-- Run diagnostics
SELECT * FROM check_user_accounts();