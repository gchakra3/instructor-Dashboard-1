/*
  # Fix Class Schedules RLS Policies

  1. Security Updates
    - Update RLS policies for class_schedules table to use consistent admin check function
    - Ensure admins can properly insert and manage class schedules
    - Fix policy naming and permissions

  2. Changes
    - Drop existing problematic policies
    - Create new policies with correct admin function calls
    - Ensure proper INSERT, UPDATE, DELETE, and SELECT permissions for admins
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can create class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Admins can manage all class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Public can read active class schedules" ON class_schedules;

-- Create new policies with consistent function names
CREATE POLICY "Admins can manage all class schedules"
  ON class_schedules
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public can read active class schedules"
  ON class_schedules
  FOR SELECT
  TO public
  USING (is_active = true);

-- Ensure the is_admin function exists (create if it doesn't)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user exists in admin_users table
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE email = auth.email()
  );
END;
$$;