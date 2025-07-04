/*
  # Function to get highest user role

  1. Purpose
    - Create a function that returns the highest role for a user
    - Used to display the most significant role in the admin dashboard
    - Prioritizes roles in order of importance: super_admin > admin > instructor > mantra_curator > user

  2. Security
    - Function is SECURITY DEFINER to ensure consistent access
    - Can be called from policies and queries
*/

-- Create function to get highest role for a user
CREATE OR REPLACE FUNCTION get_highest_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_highest_role text;
BEGIN
  -- Get the highest role based on priority
  SELECT 
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'super_admin'
      ) THEN 'super_admin'
      
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'admin'
      ) THEN 'admin'
      
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'instructor'
      ) THEN 'instructor'
      
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'mantra_curator'
      ) THEN 'mantra_curator'
      
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'user'
      ) THEN 'user'
      
      ELSE 'user' -- Default fallback
    END INTO v_highest_role;
  
  RETURN v_highest_role;
END;
$$;

-- Update get_user_profiles_for_admin function to use highest role
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
    get_highest_user_role(p.user_id) as experience_level, -- Use highest role instead of profile role
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