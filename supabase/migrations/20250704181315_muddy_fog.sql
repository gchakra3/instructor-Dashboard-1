/*
  # Fix Class Schedules RLS Policy

  1. Security Updates
    - Drop existing conflicting policies on class_schedules table
    - Create proper RLS policies for class_schedules table
    - Ensure admins can perform all operations on class schedules
    - Ensure public users can read active schedules

  2. Policy Changes
    - Remove duplicate/conflicting policies
    - Add comprehensive admin management policy
    - Add public read access for active schedules
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can create class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Admins can delete class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Admins can manage class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Admins can update class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Anyone can read active class schedules" ON class_schedules;

-- Create comprehensive admin policy for all operations
CREATE POLICY "Admins can manage all class schedules"
  ON class_schedules
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create public read policy for active schedules
CREATE POLICY "Public can read active class schedules"
  ON class_schedules
  FOR SELECT
  TO public
  USING (is_active = true);

-- Ensure RLS is enabled
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;