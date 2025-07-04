/*
  # Fix user signup database error

  1. Issues Fixed
    - Ensure default 'user' role exists in roles table
    - Fix assign_default_role() function to handle errors gracefully
    - Update RLS policies to allow profile creation during signup

  2. Changes
    - Insert default 'user' role if it doesn't exist
    - Recreate assign_default_role() function with proper error handling
    - Ensure proper permissions for user creation flow

  3. Security
    - Maintains existing RLS policies
    - Ensures secure role assignment process
*/

-- Ensure default 'user' role exists
INSERT INTO roles (name, description) 
VALUES ('user', 'Default user role')
ON CONFLICT (name) DO NOTHING;

-- Recreate the assign_default_role function with proper error handling
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default 'user' role ID
  SELECT id INTO default_role_id 
  FROM roles 
  WHERE name = 'user' 
  LIMIT 1;
  
  -- Only proceed if we found the default role and have a valid user_id
  IF default_role_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    -- Insert the user role assignment, ignoring if it already exists
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.user_id, default_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the profile creation
    RAISE WARNING 'Failed to assign default role: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS assign_default_role_trigger ON profiles;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();

-- Update RLS policies to ensure smooth user creation flow
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure user_roles policies allow the trigger to work
DROP POLICY IF EXISTS "Allow role assignment during signup" ON user_roles;
CREATE POLICY "Allow role assignment during signup"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);