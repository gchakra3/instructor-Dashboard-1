/*
  # Fix Admin Users Table

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `role` (text, default 'admin')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `admin_users` table
    - Add policies for admin access control
    - Create update trigger for updated_at field
  
  3. Initial Data
    - Insert super admin user
*/

-- First, let's check if the table exists and recreate if needed
DROP TABLE IF EXISTS admin_users CASCADE;

-- Recreate the admin_users table with proper structure
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using auth.email() instead of email()
CREATE POLICY "Admin users can read their own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

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

-- Allow service role to bypass RLS for initial setup
CREATE POLICY "Service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create the update trigger function
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Insert your admin user (this will work because service role can bypass RLS)
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- Verify the admin user was created
SELECT 'Admin user created:' as message, email, role FROM admin_users WHERE email = 'gourab.master@gmail.com';