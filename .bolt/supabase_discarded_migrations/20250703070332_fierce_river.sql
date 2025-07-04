/*
  # Fix foreign key references

  1. Changes
    - Update bookings table foreign key to reference profiles table instead of non-existent users table
    - Update user_roles table foreign key references to use profiles table
    - This resolves the "Database error saving new user" issue during signup

  2. Security
    - Maintains existing RLS policies
    - No changes to security model
*/

-- Fix bookings table foreign key reference
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(user_id);

-- Fix user_roles table foreign key references  
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;

ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(user_id);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES profiles(user_id);