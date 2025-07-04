/*
  # Database Structure Enhancements

  1. New Tables
    - `class_schedules` - Recurring class schedule templates
    - `waitlist` - Manage waiting lists for full classes
    - `user_preferences` - Store user notification and class preferences
    - `instructor_availability` - Track instructor availability
    - `class_packages` - Bundle classes for better pricing
    - `referrals` - Track user referrals and rewards

  2. Enhancements
    - Add missing indexes for better performance
    - Add constraints for data integrity
    - Create helper functions for common operations
    - Add triggers for automated workflows

  3. Views
    - Enhanced reporting views
    - Performance dashboards
    - User engagement analytics
*/

-- Create class_schedules table for recurring schedules
CREATE TABLE IF NOT EXISTS class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid NOT NULL REFERENCES class_types(id),
  instructor_id uuid NOT NULL REFERENCES instructors(id),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  max_participants integer NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  scheduled_class_id uuid NOT NULL REFERENCES scheduled_classes(id),
  position integer NOT NULL,
  email text NOT NULL,
  phone text,
  notification_sent boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, scheduled_class_id)
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  reminder_time_minutes integer DEFAULT 60, -- minutes before class
  preferred_class_types uuid[] DEFAULT '{}',
  preferred_instructors uuid[] DEFAULT '{}',
  preferred_times jsonb DEFAULT '{}', -- {"monday": ["09:00", "18:00"], ...}
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create instructor_availability table
CREATE TABLE IF NOT EXISTS instructor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES instructors(id),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create class_packages table
CREATE TABLE IF NOT EXISTS class_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  class_count integer NOT NULL,
  price decimal(10,2) NOT NULL,
  validity_days integer NOT NULL DEFAULT 90, -- package expires after X days
  class_type_restrictions uuid[], -- if null, can be used for any class type
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_packages table to track purchased packages
CREATE TABLE IF NOT EXISTS user_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  package_id uuid NOT NULL REFERENCES class_packages(id),
  classes_remaining integer NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id),
  referee_email text NOT NULL,
  referee_id uuid REFERENCES auth.users(id),
  referral_code text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  reward_amount decimal(10,2),
  reward_granted boolean DEFAULT false,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_schedules
CREATE POLICY "Anyone can read active class schedules"
  ON class_schedules
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage class schedules"
  ON class_schedules
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for waitlist
CREATE POLICY "Users can view their own waitlist entries"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own waitlist entries"
  ON waitlist
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all waitlist entries"
  ON waitlist
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for instructor_availability
CREATE POLICY "Anyone can read instructor availability"
  ON instructor_availability
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

CREATE POLICY "Instructors can manage their own availability"
  ON instructor_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instructors 
      WHERE id = instructor_availability.instructor_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all instructor availability"
  ON instructor_availability
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for class_packages
CREATE POLICY "Anyone can read active packages"
  ON class_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage packages"
  ON class_packages
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for user_packages
CREATE POLICY "Users can view their own packages"
  ON user_packages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own packages"
  ON user_packages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user packages"
  ON user_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user packages"
  ON user_packages
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can create referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all referrals"
  ON referrals
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS class_schedules_day_time_idx ON class_schedules(day_of_week, start_time);
CREATE INDEX IF NOT EXISTS class_schedules_instructor_idx ON class_schedules(instructor_id);
CREATE INDEX IF NOT EXISTS waitlist_class_position_idx ON waitlist(scheduled_class_id, position);
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS instructor_availability_instructor_day_idx ON instructor_availability(instructor_id, day_of_week);
CREATE INDEX IF NOT EXISTS user_packages_user_active_idx ON user_packages(user_id, is_active);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);

-- Add missing indexes to existing tables
CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings(email);
CREATE INDEX IF NOT EXISTS bookings_class_date_idx ON bookings(class_date);
CREATE INDEX IF NOT EXISTS yoga_queries_category_idx ON yoga_queries(category);
CREATE INDEX IF NOT EXISTS yoga_queries_status_idx ON yoga_queries(status);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages(status);

-- Create update triggers for new tables
CREATE OR REPLACE FUNCTION update_class_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_schedules_updated_at
  BEFORE UPDATE ON class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_class_schedules_updated_at();

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

CREATE OR REPLACE FUNCTION update_instructor_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instructor_availability_updated_at
  BEFORE UPDATE ON instructor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_availability_updated_at();

CREATE OR REPLACE FUNCTION update_class_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_packages_updated_at
  BEFORE UPDATE ON class_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_class_packages_updated_at();

CREATE OR REPLACE FUNCTION update_user_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_packages_updated_at
  BEFORE UPDATE ON user_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_packages_updated_at();

-- Function to automatically add user to waitlist when class is full
CREATE OR REPLACE FUNCTION auto_add_to_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  class_full boolean;
  next_position integer;
BEGIN
  -- Check if class is full
  SELECT (current_participants >= max_participants) INTO class_full
  FROM scheduled_classes
  WHERE id = NEW.scheduled_class_id;
  
  IF class_full THEN
    -- Get next position in waitlist
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
    FROM waitlist
    WHERE scheduled_class_id = NEW.scheduled_class_id;
    
    -- Add to waitlist instead of booking
    INSERT INTO waitlist (
      user_id,
      scheduled_class_id,
      position,
      email,
      phone,
      expires_at
    ) VALUES (
      NEW.user_id,
      NEW.scheduled_class_id,
      next_position,
      NEW.email,
      NEW.phone,
      now() + interval '24 hours'
    );
    
    -- Prevent the booking from being created
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to promote waitlist when booking is cancelled
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist_entry record;
BEGIN
  -- Only process if booking was cancelled
  IF OLD.booking_status = 'confirmed' AND NEW.booking_status = 'cancelled' THEN
    -- Get the next person in waitlist
    SELECT * INTO next_waitlist_entry
    FROM waitlist
    WHERE scheduled_class_id = NEW.scheduled_class_id
    AND expires_at > now()
    ORDER BY position
    LIMIT 1;
    
    IF FOUND THEN
      -- Create booking for waitlisted person
      INSERT INTO class_bookings (
        user_id,
        scheduled_class_id,
        first_name,
        last_name,
        email,
        phone,
        booking_status
      ) VALUES (
        next_waitlist_entry.user_id,
        next_waitlist_entry.scheduled_class_id,
        'Waitlist',
        'User',
        next_waitlist_entry.email,
        next_waitlist_entry.phone,
        'confirmed'
      );
      
      -- Remove from waitlist
      DELETE FROM waitlist WHERE id = next_waitlist_entry.id;
      
      -- Update positions for remaining waitlist entries
      UPDATE waitlist
      SET position = position - 1
      WHERE scheduled_class_id = next_waitlist_entry.scheduled_class_id
      AND position > next_waitlist_entry.position;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promote_from_waitlist_trigger
  AFTER UPDATE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION promote_from_waitlist();

-- Function to generate referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create user preferences on signup
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();

-- Enhanced analytics views
CREATE OR REPLACE VIEW class_performance_analytics AS
SELECT 
  ct.name as class_type,
  i.name as instructor,
  COUNT(cb.id) as total_bookings,
  COUNT(CASE WHEN cb.booking_status = 'attended' THEN 1 END) as attended_count,
  COUNT(CASE WHEN cb.booking_status = 'no_show' THEN 1 END) as no_show_count,
  ROUND(
    COUNT(CASE WHEN cb.booking_status = 'attended' THEN 1 END)::decimal / 
    NULLIF(COUNT(cb.id), 0) * 100, 2
  ) as attendance_rate,
  AVG(cf.class_rating) as avg_rating,
  SUM(t.amount) as total_revenue
FROM scheduled_classes sc
JOIN class_types ct ON sc.class_type_id = ct.id
JOIN instructors i ON sc.instructor_id = i.id
LEFT JOIN class_bookings cb ON sc.id = cb.scheduled_class_id
LEFT JOIN class_feedback cf ON cb.id = cf.booking_id
LEFT JOIN transactions t ON cb.id = t.booking_id AND t.status = 'completed'
WHERE sc.start_time >= date_trunc('month', now() - interval '3 months')
GROUP BY ct.name, i.name
ORDER BY total_revenue DESC NULLS LAST;

-- Revenue analytics view
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
  date_trunc('month', t.created_at) as month,
  t.transaction_type,
  COUNT(*) as transaction_count,
  SUM(t.amount) as total_amount,
  AVG(t.amount) as avg_amount
FROM transactions t
WHERE t.status = 'completed'
AND t.created_at >= date_trunc('month', now() - interval '12 months')
GROUP BY date_trunc('month', t.created_at), t.transaction_type
ORDER BY month DESC, transaction_type;

-- User retention view
CREATE OR REPLACE VIEW user_retention_analytics AS
WITH user_months AS (
  SELECT 
    u.id as user_id,
    date_trunc('month', u.created_at) as signup_month,
    date_trunc('month', cb.created_at) as booking_month
  FROM auth.users u
  LEFT JOIN class_bookings cb ON u.id = cb.user_id
  WHERE u.created_at >= date_trunc('month', now() - interval '12 months')
),
cohort_data AS (
  SELECT 
    signup_month,
    booking_month,
    COUNT(DISTINCT user_id) as users
  FROM user_months
  WHERE booking_month IS NOT NULL
  GROUP BY signup_month, booking_month
),
cohort_sizes AS (
  SELECT 
    signup_month,
    COUNT(DISTINCT user_id) as cohort_size
  FROM user_months
  GROUP BY signup_month
)
SELECT 
  cd.signup_month,
  cs.cohort_size,
  cd.booking_month,
  cd.users,
  ROUND(cd.users::decimal / cs.cohort_size * 100, 2) as retention_rate,
  EXTRACT(month FROM age(cd.booking_month, cd.signup_month)) as months_since_signup
FROM cohort_data cd
JOIN cohort_sizes cs ON cd.signup_month = cs.signup_month
ORDER BY cd.signup_month, cd.booking_month;

-- Insert sample data for new tables
INSERT INTO class_packages (name, description, class_count, price, validity_days) VALUES
  ('Starter Pack', 'Perfect for beginners - 5 classes', 5, 99.99, 60),
  ('Regular Pack', 'Great value - 10 classes', 10, 179.99, 90),
  ('Premium Pack', 'Best value - 20 classes', 20, 319.99, 120),
  ('Unlimited Monthly', 'Unlimited classes for 30 days', -1, 149.99, 30);

-- Insert sample class schedules
INSERT INTO class_schedules (class_type_id, instructor_id, day_of_week, start_time, duration_minutes, max_participants)
SELECT 
  ct.id,
  i.id,
  1, -- Monday
  '09:00'::time,
  60,
  15
FROM class_types ct, instructors i
WHERE ct.name = 'Beginner Hatha Yoga' AND i.name = 'Priya Sharma'
LIMIT 1;

INSERT INTO class_schedules (class_type_id, instructor_id, day_of_week, start_time, duration_minutes, max_participants)
SELECT 
  ct.id,
  i.id,
  3, -- Wednesday
  '18:00'::time,
  75,
  12
FROM class_types ct, instructors i
WHERE ct.name = 'Vinyasa Flow' AND i.name = 'David Thompson'
LIMIT 1;

INSERT INTO class_schedules (class_type_id, instructor_id, day_of_week, start_time, duration_minutes, max_participants)
SELECT 
  ct.id,
  i.id,
  5, -- Friday
  '19:00'::time,
  90,
  8
FROM class_types ct, instructors i
WHERE ct.name = 'Restorative Yoga' AND i.name = 'Lisa Chen'
LIMIT 1;