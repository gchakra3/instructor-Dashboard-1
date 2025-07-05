/*
  # Add INSERT policy for class_schedules table

  1. Security Changes
    - Add INSERT policy for class_schedules table to allow admins to create new schedules
    - This resolves the RLS violation error when admins try to add new class schedules

  The policy allows authenticated users with admin privileges to insert new class schedules.
*/

-- Add INSERT policy for class_schedules table
CREATE POLICY "Admins can create class schedules"
  ON class_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin());