/*
  # Create admin users table and setup

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `role` (text, default 'admin')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `admin_users` table
    - Add policy for admin users to read their own data
    - Add policy for super admins to manage all admin users

  3. Initial Data
    - Insert default admin user
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text DEFAULT 'admin' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Insert default admin users
INSERT INTO admin_users (email, role) VALUES 
  ('admin@yogodaan.com', 'super_admin'),
  ('priya@yogodaan.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();