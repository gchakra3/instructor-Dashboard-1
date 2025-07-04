/*
  # Fix foreign key references

  1. Changes
    - Update bookings table foreign key to reference auth.users table directly
    - Remove references to non-existent tables (profiles, user_roles)
    - This resolves the "Database error saving new user" issue during signup

  2. Security
    - Maintains existing RLS policies
    - No changes to security model
*/

-- Fix bookings table foreign key reference to use auth.users
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Note: user_roles table doesn't exist in the current schema, so no changes needed for it