/*
  # Fix User Roles Functionality

  1. New Functions
    - Improved functions for role management
    - Better handling of role updates

  2. Performance Improvements
    - Optimized role checking
    - Added index for faster role lookups

  3. Database Fixes
    - Ensure proper handling of user role assignments
*/

-- Create index to improve role lookup performance
CREATE INDEX IF NOT EXISTS user_roles_user_id_role_id_idx ON user_roles(user_id, role_id);

-- Improved function to check if a user has a specific role
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

-- Update the is_admin function to properly check user roles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check both admin_users table AND user_roles table
  RETURN (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email()
    )
    OR
    has_role('admin')
    OR
    has_role('super_admin')
  );
END;
$$;

-- Update mantra curator checker
CREATE OR REPLACE FUNCTION is_mantra_curator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN has_role('mantra_curator');
END;
$$;

-- Function to get a user's highest role
CREATE OR REPLACE FUNCTION get_highest_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  highest_role text;
BEGIN
  -- Priority order: super_admin > admin > instructor > mantra_curator > user
  SELECT 
    CASE
      WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'super_admin') THEN 'super_admin'
      WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'admin') THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'instructor') THEN 'instructor'
      WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'mantra_curator') THEN 'mantra_curator'
      WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND r.name = 'user') THEN 'user'
      ELSE 'user'
    END INTO highest_role;
  
  RETURN highest_role;
END;
$$;

-- Update the get_user_profiles_for_admin function to use the highest role
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
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.phone,
    p.bio,
    get_highest_user_role(p.user_id) as experience_level, -- Use highest role
    p.created_at,
    p.updated_at,
    p.email,
    u.created_at as user_created_at,
    ARRAY(
      SELECT r.name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = p.user_id
    ) as user_roles
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
END;
$$;