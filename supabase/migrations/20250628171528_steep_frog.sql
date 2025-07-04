/*
  # Fix admin_users table and RLS policies

  1. Tables
    - Drop and recreate admin_users table with proper structure
    - Add proper RLS policies that work correctly
    - Insert admin user record

  2. Security
    - Enable RLS on admin_users table
    - Add policies for authenticated users and service role
    - Ensure proper access control
*/

-- Drop existing table and policies to start fresh
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create admin_users table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies that work properly
-- Allow authenticated users to read their own admin record
CREATE POLICY "Admin users can read their own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (email = (SELECT auth.email()));

-- Allow service role full access (needed for migrations and admin operations)
CREATE POLICY "Service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow super admins to manage other admin users
CREATE POLICY "Super admins can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT auth.email()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT auth.email()) AND role = 'super_admin'
    )
  );

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Insert the admin user
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- Verify the admin user exists
SELECT 'Admin user verification:' as status, email, role, created_at 
FROM admin_users 
WHERE email = 'gourab.master@gmail.com';