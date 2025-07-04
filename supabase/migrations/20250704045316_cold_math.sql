/*
  # Connect User Roles to Admin Access

  1. New Functions
    - Create function to check if user has admin role
    - Create function to check if user has mantra_curator role

  2. Enhanced RLS Policies
    - Update existing RLS policies to use role-based checks
    - Ensure users with admin roles have proper access
    
  3. New Policies
    - Allow users with appropriate roles to access admin features
    - Grant proper role-based permissions for content management
*/

-- Create helper function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
END;
$$;

-- Create function to check if user is admin (combines admin_users and roles)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check both admin_users table AND user_roles table
  RETURN (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email())
    OR
    has_role('admin')
    OR
    has_role('super_admin')
  );
END;
$$;

-- Create function to check if user is mantra curator
CREATE OR REPLACE FUNCTION is_mantra_curator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN has_role('mantra_curator');
END;
$$;

-- Insert admin roles for existing admin users
INSERT INTO roles (name, description)
VALUES 
  ('admin', 'Administrator with management permissions'),
  ('super_admin', 'Super administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Ensure mantra_curator role exists
INSERT INTO roles (name, description)
VALUES ('mantra_curator', 'Can create, edit, and delete their own articles')
ON CONFLICT (name) DO NOTHING;

-- Add RLS policy for mantra curators to manage their own articles
DROP POLICY IF EXISTS "Mantra curators can manage their own articles" ON articles;
CREATE POLICY "Mantra curators can manage their own articles"
  ON articles
  FOR ALL
  TO authenticated
  USING (
    (author_id = auth.uid() AND is_mantra_curator())
  )
  WITH CHECK (
    (author_id = auth.uid() AND is_mantra_curator())
  );

-- Associate existing admin users with roles
DO $$
DECLARE
  admin_user RECORD;
  admin_role_id UUID;
  super_admin_role_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';

  -- For each admin user, add appropriate role
  FOR admin_user IN SELECT id, email, role FROM admin_users
  LOOP
    -- Get user ID from auth.users
    DECLARE
      user_id UUID;
    BEGIN
      SELECT id INTO user_id FROM auth.users WHERE email = admin_user.email;
      
      IF user_id IS NOT NULL THEN
        IF admin_user.role = 'super_admin' THEN
          -- Insert super_admin role
          INSERT INTO user_roles (user_id, role_id)
          VALUES (user_id, super_admin_role_id)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        ELSE
          -- Insert admin role
          INSERT INTO user_roles (user_id, role_id)
          VALUES (user_id, admin_role_id)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Error adding role for admin %: %', admin_user.email, SQLERRM;
    END;
  END LOOP;
END
$$;

-- Ensure admin dashboard access for both admin_users and users with admin roles
CREATE OR REPLACE FUNCTION check_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    -- Check admin_users table (legacy method)
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email())
    OR 
    -- Check user_roles table (new method)
    has_role('admin') 
    OR 
    has_role('super_admin')
  );
END;
$$;

-- Add appropriate RLS policies for admin functionality
-- Note: Only adding a few key policies as examples
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
CREATE POLICY "Admins can manage all bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage all submissions" ON form_submissions;
CREATE POLICY "Admins can manage all submissions"
  ON form_submissions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add policy for article management
DROP POLICY IF EXISTS "Admins can manage articles" ON articles;
CREATE POLICY "Admins can manage articles"
  ON articles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());