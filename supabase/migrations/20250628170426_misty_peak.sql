/*
  # Debug Admin Access Issue

  This migration will help us identify and fix the admin access problem.
  
  1. Check if admin_users table exists and has data
  2. Verify the user account exists in auth.users
  3. Ensure proper RLS policies
  4. Fix any data inconsistencies
*/

-- First, let's check if the admin_users table exists and what data it contains
SELECT 'Checking admin_users table...' as step;
SELECT * FROM admin_users;

-- Check if there are any users in the auth.users table with your email
SELECT 'Checking auth.users table...' as step;
SELECT id, email, created_at FROM auth.users WHERE email = 'gourab.master@gmail.com';

-- Let's also check the RLS policies on admin_users table
SELECT 'Checking RLS policies...' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- Now let's ensure your admin record exists with the correct email
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- Verify the admin record was created/updated
SELECT 'Final verification...' as step;
SELECT id, email, role, created_at, updated_at FROM admin_users WHERE email = 'gourab.master@gmail.com';