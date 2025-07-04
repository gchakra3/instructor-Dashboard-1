/*
  # Update Admin System - Remove Demo Credentials

  1. Database Changes
    - The admin_users table already exists with proper structure
    - Remove any demo/hardcoded admin entries
    - Update RLS policies to use proper email() function

  2. Security
    - Admin access is now controlled entirely through the admin_users table
    - No hardcoded credentials in the application
    - Proper RLS policies for data access

  3. Usage
    - Create regular user accounts first
    - Add users to admin_users table via Supabase dashboard or super admin
    - Users can then access admin panel with their regular credentials
*/

-- Remove any existing demo admin entries (if they exist)
DELETE FROM admin_users WHERE email IN ('admin@yogodaan.com', 'priya@yogodaan.com');

-- Update RLS policies to use auth.email() instead of email()
DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;

-- Create updated policies
CREATE POLICY "Admin users can read their own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.email() = email);

CREATE POLICY "Super admins can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role = 'super_admin'
    )
  );

-- Add policy for super admins to insert new admin users
CREATE POLICY "Super admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role = 'super_admin'
    )
  );