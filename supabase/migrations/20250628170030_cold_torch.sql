/*
  # Add First Admin User

  1. New Admin User
    - Adds your email to the admin_users table with super_admin role
    - Allows access to the admin dashboard
    
  2. Security
    - Uses ON CONFLICT DO NOTHING to prevent duplicates
    - Grants super_admin privileges for full access
    
  3. Instructions
    - Replace 'your-email@example.com' with your actual email
    - Make sure you've created a user account with this email first
    - The email must match exactly (case-sensitive)
*/

-- Add your first admin user
-- IMPORTANT: Replace 'your-email@example.com' with your actual email address
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Optional: Add additional admin users if needed
-- Uncomment and modify the lines below to add more admins
-- INSERT INTO admin_users (email, role) 
-- VALUES ('admin2@example.com', 'admin')
-- ON CONFLICT (email) DO NOTHING;

-- INSERT INTO admin_users (email, role) 
-- VALUES ('admin3@example.com', 'admin')
-- ON CONFLICT (email) DO NOTHING;