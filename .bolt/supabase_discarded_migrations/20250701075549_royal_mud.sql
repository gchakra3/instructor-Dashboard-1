/*
  # Fix Admin Dashboard Data Access

  1. Update RLS Policies
    - Add admin access policies for bookings, yoga_queries, and contact_messages
    - Ensure admins can read all data for dashboard analytics

  2. Security
    - Maintain security while allowing admin access
    - Use proper admin role checking
*/

-- Add admin access policy for bookings
CREATE POLICY "Admins can read all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Add admin access policy for yoga_queries
CREATE POLICY "Admins can read all queries"
  ON yoga_queries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Add admin update policy for yoga_queries
CREATE POLICY "Admins can update queries"
  ON yoga_queries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Add admin access policy for contact_messages
CREATE POLICY "Admins can read all contacts"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Add admin update policy for contact_messages
CREATE POLICY "Admins can update contacts"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Create a helper function to check admin role
CREATE OR REPLACE FUNCTION check_admin_role(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles table to allow admin access
CREATE POLICY "Enable admin access to all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (check_admin_role(auth.uid()));