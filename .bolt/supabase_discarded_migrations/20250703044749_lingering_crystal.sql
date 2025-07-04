/*
  # Enhance Booking System

  1. New Tables
    - `class_bookings` (to replace/supplement existing bookings)
      - Links to scheduled_classes
      - Better tracking of class attendance
      - Payment status tracking

  2. Functions
    - Auto-update participant counts
    - Booking validation

  3. Views
    - User booking history
    - Class availability
*/

-- Create enhanced class_bookings table
CREATE TABLE IF NOT EXISTS class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  scheduled_class_id uuid NOT NULL REFERENCES scheduled_classes(id),
  profile_id uuid REFERENCES profiles(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  emergency_contact text,
  emergency_phone text,
  special_requests text DEFAULT '',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  booking_status text DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  booking_date timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own bookings"
  ON class_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON class_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON class_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create bookings"
  ON class_bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can manage all bookings"
  ON class_bookings
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS class_bookings_user_id_idx ON class_bookings(user_id);
CREATE INDEX IF NOT EXISTS class_bookings_scheduled_class_id_idx ON class_bookings(scheduled_class_id);
CREATE INDEX IF NOT EXISTS class_bookings_booking_status_idx ON class_bookings(booking_status);
CREATE INDEX IF NOT EXISTS class_bookings_payment_status_idx ON class_bookings(payment_status);

-- Function to update participant count
CREATE OR REPLACE FUNCTION update_class_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_participants count for the scheduled class
  UPDATE scheduled_classes 
  SET current_participants = (
    SELECT COUNT(*) 
    FROM class_bookings 
    WHERE scheduled_class_id = COALESCE(NEW.scheduled_class_id, OLD.scheduled_class_id)
    AND booking_status = 'confirmed'
  )
  WHERE id = COALESCE(NEW.scheduled_class_id, OLD.scheduled_class_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update participant count
CREATE TRIGGER update_participant_count_on_insert
  AFTER INSERT ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_participant_count();

CREATE TRIGGER update_participant_count_on_update
  AFTER UPDATE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_participant_count();

CREATE TRIGGER update_participant_count_on_delete
  AFTER DELETE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_participant_count();

-- Function to check class availability
CREATE OR REPLACE FUNCTION check_class_availability(class_id uuid)
RETURNS boolean AS $$
DECLARE
  max_participants integer;
  current_participants integer;
BEGIN
  SELECT 
    sc.max_participants,
    sc.current_participants
  INTO max_participants, current_participants
  FROM scheduled_classes sc
  WHERE sc.id = class_id;
  
  RETURN current_participants < max_participants;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for class_bookings
CREATE OR REPLACE FUNCTION update_class_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_bookings_updated_at
  BEFORE UPDATE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_bookings_updated_at();

-- Create view for user booking history
CREATE OR REPLACE VIEW user_booking_history AS
SELECT 
  cb.id,
  cb.user_id,
  cb.booking_status,
  cb.payment_status,
  cb.booking_date,
  cb.created_at,
  sc.start_time,
  sc.end_time,
  ct.name as class_name,
  ct.description as class_description,
  ct.duration_minutes,
  ct.difficulty_level,
  i.name as instructor_name,
  sc.meeting_link
FROM class_bookings cb
JOIN scheduled_classes sc ON cb.scheduled_class_id = sc.id
JOIN class_types ct ON sc.class_type_id = ct.id
JOIN instructors i ON sc.instructor_id = i.id
ORDER BY sc.start_time DESC;

-- Create view for class availability
CREATE OR REPLACE VIEW class_availability AS
SELECT 
  sc.id,
  sc.start_time,
  sc.end_time,
  sc.status,
  sc.max_participants,
  sc.current_participants,
  (sc.max_participants - sc.current_participants) as available_spots,
  ct.name as class_name,
  ct.description,
  ct.duration_minutes,
  ct.difficulty_level,
  ct.price,
  i.name as instructor_name,
  i.bio as instructor_bio,
  sc.meeting_link
FROM scheduled_classes sc
JOIN class_types ct ON sc.class_type_id = ct.id
JOIN instructors i ON sc.instructor_id = i.id
WHERE sc.status = 'scheduled'
AND sc.start_time > now()
ORDER BY sc.start_time;