/*
  # Add Class Schedule Management

  1. New Tables
    - `instructors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `bio` (text)
      - `specializations` (text array)
      - `avatar_url` (text)
      - `is_active` (boolean)

    - `class_types`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `duration_minutes` (integer)
      - `difficulty_level` (text)
      - `max_participants` (integer)
      - `price` (decimal)

    - `scheduled_classes`
      - `id` (uuid, primary key)
      - `class_type_id` (uuid, references class_types)
      - `instructor_id` (uuid, references instructors)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `max_participants` (integer)
      - `current_participants` (integer, default 0)
      - `status` (text, default 'scheduled')
      - `meeting_link` (text)

  2. Security
    - Enable RLS on all tables
    - Public can read active classes and instructors
    - Admins can manage all data
*/

-- Create instructors table
CREATE TABLE IF NOT EXISTS instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  bio text,
  specializations text[] DEFAULT '{}',
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create class_types table
CREATE TABLE IF NOT EXISTS class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  difficulty_level text DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  max_participants integer DEFAULT 10,
  price decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scheduled_classes table
CREATE TABLE IF NOT EXISTS scheduled_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid NOT NULL REFERENCES class_types(id),
  instructor_id uuid NOT NULL REFERENCES instructors(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  max_participants integer NOT NULL,
  current_participants integer DEFAULT 0,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_link text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;

-- Policies for instructors
CREATE POLICY "Anyone can read active instructors"
  ON instructors
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage instructors"
  ON instructors
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Policies for class_types
CREATE POLICY "Anyone can read active class types"
  ON class_types
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage class types"
  ON class_types
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Policies for scheduled_classes
CREATE POLICY "Anyone can read scheduled classes"
  ON scheduled_classes
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('scheduled', 'in_progress'));

CREATE POLICY "Admins can manage scheduled classes"
  ON scheduled_classes
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS instructors_user_id_idx ON instructors(user_id);
CREATE INDEX IF NOT EXISTS instructors_is_active_idx ON instructors(is_active);
CREATE INDEX IF NOT EXISTS class_types_difficulty_level_idx ON class_types(difficulty_level);
CREATE INDEX IF NOT EXISTS class_types_is_active_idx ON class_types(is_active);
CREATE INDEX IF NOT EXISTS scheduled_classes_start_time_idx ON scheduled_classes(start_time);
CREATE INDEX IF NOT EXISTS scheduled_classes_status_idx ON scheduled_classes(status);
CREATE INDEX IF NOT EXISTS scheduled_classes_instructor_id_idx ON scheduled_classes(instructor_id);

-- Update triggers
CREATE OR REPLACE FUNCTION update_instructors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW
  EXECUTE FUNCTION update_instructors_updated_at();

CREATE OR REPLACE FUNCTION update_class_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_types_updated_at
  BEFORE UPDATE ON class_types
  FOR EACH ROW
  EXECUTE FUNCTION update_class_types_updated_at();

CREATE OR REPLACE FUNCTION update_scheduled_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_classes_updated_at
  BEFORE UPDATE ON scheduled_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_classes_updated_at();

-- Insert sample data
INSERT INTO instructors (name, bio, specializations, is_active) VALUES
  ('Priya Sharma', 'Founder & Lead Instructor with 15+ years of experience', ARRAY['Hatha', 'Vinyasa', 'Meditation'], true),
  ('David Thompson', 'Senior Instructor specializing in Power Yoga', ARRAY['Power Yoga', 'Meditation', 'Breathwork'], true),
  ('Lisa Chen', 'Wellness Coach focusing on restorative practices', ARRAY['Restorative', 'Yin Yoga', 'Breathwork'], true);

INSERT INTO class_types (name, description, duration_minutes, difficulty_level, max_participants, price) VALUES
  ('Beginner Hatha Yoga', 'Gentle introduction to yoga postures and breathing', 60, 'beginner', 15, 25.00),
  ('Vinyasa Flow', 'Dynamic flowing sequences linking breath and movement', 75, 'intermediate', 12, 30.00),
  ('Power Yoga', 'Strength-building yoga practice for fitness enthusiasts', 60, 'advanced', 10, 35.00),
  ('Restorative Yoga', 'Relaxing practice using props for deep restoration', 90, 'beginner', 8, 28.00),
  ('Corporate Wellness Session', 'Workplace-friendly yoga and stress relief', 45, 'beginner', 20, 40.00);