/*
  # Class Assignment and Payment Management System

  1. New Tables
    - `class_assignments`
      - `id` (uuid, primary key)
      - `scheduled_class_id` (uuid, references scheduled_classes)
      - `instructor_id` (uuid, references users)
      - `assigned_by` (uuid, references users)
      - `payment_amount` (decimal)
      - `payment_status` (enum: pending, paid, cancelled)
      - `notes` (text, optional)
      - `assigned_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `class_assignments` table
    - Add policies for admins to manage all assignments
    - Add policies for instructors/yoga acharyas to view their own assignments
    - Add policies for yoga acharyas to assign classes if permitted
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
  instructor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  payment_amount decimal(10,2) NOT NULL DEFAULT 0.00,
  payment_status payment_status DEFAULT 'pending',
  notes text,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE class_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all class assignments"
  ON class_assignments
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Instructors can view their own assignments"
  ON class_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = instructor_id);

CREATE POLICY "Yoga acharyas can view their own assignments"
  ON class_assignments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = instructor_id OR
    (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name = 'yoga_acharya'
      )
    )
  );

CREATE POLICY "Yoga acharyas can assign classes"
  ON class_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('yoga_acharya', 'admin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS class_assignments_instructor_id_idx ON class_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS class_assignments_scheduled_class_id_idx ON class_assignments(scheduled_class_id);
CREATE INDEX IF NOT EXISTS class_assignments_payment_status_idx ON class_assignments(payment_status);
CREATE INDEX IF NOT EXISTS class_assignments_assigned_at_idx ON class_assignments(assigned_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_class_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_assignments_updated_at
  BEFORE UPDATE ON class_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_class_assignments_updated_at();