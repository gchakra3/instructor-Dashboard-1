/*
  # Fix class assignments table with proper auth.users references

  1. New Tables
    - `class_assignments`
      - `id` (uuid, primary key)
      - `scheduled_class_id` (uuid, references scheduled_classes)
      - `instructor_id` (uuid, references auth.users)
      - `assigned_by` (uuid, references auth.users)
      - `payment_amount` (decimal)
      - `payment_status` (enum: pending, paid, cancelled)
      - `notes` (text)
      - `assigned_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `class_assignments` table
    - Add policies for admins, instructors, and yoga acharyas

  3. Changes
    - Create payment_status enum type
    - Add indexes for performance
    - Add trigger for updated_at
*/

-- Create enum for payment status
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create class_assignments table
CREATE TABLE IF NOT EXISTS class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_class_id uuid REFERENCES scheduled_classes(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL,
  assigned_by uuid,
  payment_amount decimal(10,2) NOT NULL DEFAULT 0.00,
  payment_status payment_status DEFAULT 'pending',
  notes text,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Add foreign key constraints to auth.users
  CONSTRAINT fk_class_assignments_instructor 
    FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_assignments_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all class assignments"
  ON class_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Instructors can view their own assignments"
  ON class_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = instructor_id);

CREATE POLICY "Yoga acharyas can view and manage assignments"
  ON class_assignments
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = instructor_id OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'yoga_acharya'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('yoga_acharya', 'admin', 'super_admin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS class_assignments_instructor_id_idx ON class_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS class_assignments_scheduled_class_id_idx ON class_assignments(scheduled_class_id);
CREATE INDEX IF NOT EXISTS class_assignments_payment_status_idx ON class_assignments(payment_status);
CREATE INDEX IF NOT EXISTS class_assignments_assigned_at_idx ON class_assignments(assigned_at);

-- Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_class_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_class_assignments_updated_at ON class_assignments;
CREATE TRIGGER update_class_assignments_updated_at
  BEFORE UPDATE ON class_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_class_assignments_updated_at();