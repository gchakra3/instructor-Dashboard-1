/*
  # Add admin policies for class schedules management

  1. Security Updates
    - Add INSERT policy for admins to create class schedules
    - Add UPDATE policy for admins to modify class schedules
    - Add DELETE policy for admins to remove class schedules
    
  2. Policy Details
    - Uses existing `check_is_admin()` function to verify admin permissions
    - Allows full CRUD operations for authenticated admin users
    - Maintains existing SELECT policies for public access
*/

-- Add INSERT policy for admins to create class schedules
CREATE POLICY "Admins can create class schedules"
  ON class_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin());

-- Add UPDATE policy for admins to modify class schedules
CREATE POLICY "Admins can update class schedules"
  ON class_schedules
  FOR UPDATE
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Add DELETE policy for admins to remove class schedules
CREATE POLICY "Admins can delete class schedules"
  ON class_schedules
  FOR DELETE
  TO authenticated
  USING (check_is_admin());