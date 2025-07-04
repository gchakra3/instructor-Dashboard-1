/*
  # Connect User Roles to Admin Access

  1. Functions
    - Create helper functions to check user roles and admin status
    - Add functions to verify admin permissions for various operations

  2. Security
    - Ensure proper role-based access control
    - Add functions that can be used in RLS policies

  3. Changes
    - Add utility functions for role checking
    - Improve admin access control mechanisms
*/

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user can manage roles (super admin)
CREATE OR REPLACE FUNCTION check_can_manage_roles()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a mantra curator
CREATE OR REPLACE FUNCTION is_mantra_curator()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'instructor', 'curator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check admin status (alternative naming for consistency)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN check_is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;