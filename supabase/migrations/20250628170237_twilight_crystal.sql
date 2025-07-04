/*
  # Verify Admin Setup

  1. Check Admin Users
    - Verify admin user exists
    - Check role assignment
  
  2. Test Admin Access
    - Ensure proper permissions are set
*/

-- Check if the admin user exists
SELECT 
  id,
  email,
  role,
  created_at
FROM admin_users 
WHERE email = 'gourab.master@gmail.com';

-- If the above query returns no results, insert the admin user
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- Verify the admin user was created/updated
SELECT 
  id,
  email,
  role,
  created_at,
  updated_at
FROM admin_users 
WHERE email = 'gourab.master@gmail.com';