/*
  # Initial Yogodaan Database Schema

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `class_name` (text)
      - `instructor` (text)
      - `class_date` (date)
      - `class_time` (text)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `experience_level` (text)
      - `special_requests` (text)
      - `emergency_contact` (text)
      - `emergency_phone` (text)
      - `status` (text, default 'confirmed')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `yoga_queries`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `subject` (text)
      - `category` (text)
      - `message` (text)
      - `experience_level` (text)
      - `status` (text, default 'pending')
      - `response` (text)
      - `responded_at` (timestamp)
      - `created_at` (timestamp)

    - `contact_messages`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `subject` (text)
      - `message` (text)
      - `status` (text, default 'new')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public access where appropriate
*/

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  class_name text NOT NULL,
  instructor text NOT NULL,
  class_date date NOT NULL DEFAULT CURRENT_DATE,
  class_time text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  experience_level text NOT NULL DEFAULT 'beginner',
  special_requests text DEFAULT '',
  emergency_contact text NOT NULL,
  emergency_phone text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create yoga_queries table
CREATE TABLE IF NOT EXISTS yoga_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  experience_level text NOT NULL DEFAULT 'beginner',
  status text NOT NULL DEFAULT 'pending',
  response text DEFAULT '',
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yoga_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous users to create bookings (for guest bookings)
CREATE POLICY "Anonymous users can create bookings"
  ON bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Yoga queries policies
CREATE POLICY "Anyone can create yoga queries"
  ON yoga_queries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own queries"
  ON yoga_queries
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- Contact messages policies
CREATE POLICY "Anyone can create contact messages"
  ON contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create updated_at trigger for bookings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();