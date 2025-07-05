/*
  # Fix Class Types RLS Policies

  1. Security Updates
    - Update RLS policies for class_types table to work with current admin system
    - Ensure proper admin checks are in place
    - Fix delete operations for class types

  2. Changes
    - Drop existing policies that might be causing issues
    - Create new policies that work with the current admin system
    - Add proper admin function checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage class types" ON class_types;
DROP POLICY IF EXISTS "Anyone can read active class types" ON class_types;

-- Create updated policies that work with the current admin system
CREATE POLICY "Admins can manage class types"
  ON class_types
  FOR ALL
  TO authenticated
  USING (
    -- Check if user is admin via admin_users table OR has admin role
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'super_admin')
    )
  );

-- Allow public to read active class types
CREATE POLICY "Anyone can read active class types"
  ON class_types
  FOR SELECT
  TO public
  USING (is_active = true);

-- Update the check_is_admin function to be more robust
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Check admin_users table first
  IF EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN true;
  END IF;

  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin() TO anon;