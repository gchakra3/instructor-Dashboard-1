/*
  # Add First Admin User

  1. New Admin User
    - Add the first super admin user to admin_users table
    - This allows initial access to the admin dashboard

  2. Security
    - Uses ON CONFLICT to prevent duplicate entries
    - Sets role as 'super_admin' for full administrative privileges

  3. Instructions
    - Replace 'your-email@example.com' with your actual email address
    - Make sure this email matches the one you use to sign up through the application
*/

-- Add your first admin user
-- IMPORTANT: Replace 'your-email@example.com' with your actual email address
INSERT INTO admin_users (email, role) 
VALUES ('your-email@example.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Optional: Add additional admin users if needed
-- Uncomment and modify the lines below to add more admins
-- INSERT INTO admin_users (email, role) 
-- VALUES ('admin2@example.com', 'admin')
-- ON CONFLICT (email) DO NOTHING;

-- INSERT INTO admin_users (email, role) 
-- VALUES ('admin3@example.com', 'admin')
-- ON CONFLICT (email) DO NOTHING;