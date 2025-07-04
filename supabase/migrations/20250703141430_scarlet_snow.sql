/*
  # Fix User Signup Database Triggers

  1. New Tables
    - Ensure default roles exist in roles table
    
  2. Security
    - Fix trigger functions for user signup
    - Ensure proper default role assignment
    
  3. Changes
    - Add default roles if they don't exist
    - Update trigger functions to handle edge cases
    - Ensure profile creation works properly
*/

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES 
  ('user', 'Default user role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
  ('admin', 'Administrator role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
  ('instructor', 'Yoga instructor role')
ON CONFLICT (name) DO NOTHING;

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default 'user' role ID
  SELECT id INTO default_role_id FROM roles WHERE name = 'user' LIMIT 1;
  
  -- Create profile for new user
  INSERT INTO profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  
  -- Assign default role if role exists
  IF default_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the assign_default_role function
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default 'user' role ID
  SELECT id INTO default_role_id FROM roles WHERE name = 'user' LIMIT 1;
  
  -- Assign default role if it exists and user doesn't already have it
  IF default_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.user_id, default_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE LOG 'Error in assign_default_role: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure the assign_default_role trigger exists on profiles
DROP TRIGGER IF EXISTS assign_default_role_trigger ON profiles;

CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_default_role();

-- Update RLS policies to ensure they work correctly during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure user_roles policies allow insertion during signup
DROP POLICY IF EXISTS "Allow role assignment during signup" ON user_roles;
CREATE POLICY "Allow role assignment during signup"
  ON user_roles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);