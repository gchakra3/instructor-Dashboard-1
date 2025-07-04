/*
  # Simple Admin Table Fix

  1. Tables
    - Recreate admin_users table with minimal RLS complexity
    - Use simpler policies that are less likely to cause 500 errors

  2. Security
    - Enable RLS with basic policies
    - Allow service role full access
    - Allow authenticated users to read admin records

  3. Data
    - Insert admin user record
*/

-- Drop existing table completely
DROP TABLE IF EXISTS admin_users CASCADE;

-- Recreate table with simple structure
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create very simple policies to avoid 500 errors
-- Allow service role full access (this is what the app will use for admin checks)
CREATE POLICY "service_role_access" ON admin_users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read admin records (simplified)
CREATE POLICY "authenticated_read" ON admin_users
  FOR SELECT TO authenticated
  USING (true);

-- Create update function
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

-- Insert admin user
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin');

-- Verify insertion
SELECT 'Admin user created successfully:' as message, email, role 
FROM admin_users 
WHERE email = 'gourab.master@gmail.com';