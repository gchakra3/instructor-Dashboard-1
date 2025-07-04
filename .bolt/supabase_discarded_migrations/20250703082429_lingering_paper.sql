/*
  # Database Schema Improvements

  1. New Tables
    - `class_bookings` - Enhanced booking system with better tracking
    - `waitlist` - Waitlist functionality for full classes
    - `user_packages` - Class packages and credits system
    - `class_packages` - Package definitions
    - `instructor_availability` - Instructor scheduling
    - `user_preferences` - User notification and class preferences
    - `referrals` - Referral program tracking
    - `payment_methods` - Stored payment methods
    - `class_feedback` - Post-class feedback system
    - `user_activity` - Activity logging
    - `system_metrics` - System performance metrics
    - `newsletter_subscriptions` - Newsletter management

  2. Enhanced Features
    - Waitlist management
    - Package-based bookings
    - Instructor availability tracking
    - User preferences and notifications
    - Referral system
    - Payment method storage
    - Feedback collection
    - Activity tracking
    - Newsletter management

  3. Security
    - Proper RLS policies for all new tables
    - Admin and user access controls
    - Data privacy compliance
*/

-- Enhanced class bookings table (replaces simple bookings)
CREATE TABLE IF NOT EXISTS class_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  scheduled_class_id uuid, -- Will reference scheduled_classes
  profile_id uuid REFERENCES profiles(user_id),
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

-- Scheduled classes table (specific class instances)
CREATE TABLE IF NOT EXISTS scheduled_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid REFERENCES class_types(id) NOT NULL,
  instructor_id uuid REFERENCES instructors(id) NOT NULL,
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

-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  scheduled_class_id uuid REFERENCES scheduled_classes(id) NOT NULL,
  position integer NOT NULL,
  email text NOT NULL,
  phone text,
  notification_sent boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, scheduled_class_id)
);

-- Class packages table
CREATE TABLE IF NOT EXISTS class_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  class_count integer NOT NULL,
  price decimal(10,2) NOT NULL,
  validity_days integer DEFAULT 90 NOT NULL,
  class_type_restrictions uuid[], -- Array of class_type_ids
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User packages table (purchased packages)
CREATE TABLE IF NOT EXISTS user_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  package_id uuid REFERENCES class_packages(id) NOT NULL,
  classes_remaining integer NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Instructor availability table
CREATE TABLE IF NOT EXISTS instructor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid REFERENCES instructors(id) NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE NOT NULL,
  effective_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  reminder_time_minutes integer DEFAULT 60,
  preferred_class_types uuid[] DEFAULT '{}',
  preferred_instructors uuid[] DEFAULT '{}',
  preferred_times jsonb DEFAULT '{}', -- Store time preferences as JSON
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) NOT NULL,
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

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  stripe_payment_method_id text NOT NULL,
  type text NOT NULL, -- 'card', 'bank_account', etc.
  last_four text,
  brand text,
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Class feedback table
CREATE TABLE IF NOT EXISTS class_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES class_bookings(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  scheduled_class_id uuid REFERENCES scheduled_classes(id) NOT NULL,
  instructor_rating integer CHECK (instructor_rating >= 1 AND instructor_rating <= 5),
  class_rating integer CHECK (class_rating >= 1 AND class_rating <= 5),
  difficulty_rating integer CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  would_recommend boolean,
  feedback_text text,
  suggestions text,
  created_at timestamptz DEFAULT now()
);

-- User activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL, -- 'login', 'booking', 'class_attended', 'article_viewed', etc.
  entity_type text, -- 'class', 'article', 'booking', etc.
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value decimal(15,2) NOT NULL,
  metric_type text NOT NULL, -- 'count', 'percentage', 'currency', 'time'
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Newsletter subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  subscribed boolean DEFAULT true,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE(user_id, email)
);

-- Newsletters table
CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roles table for better role management
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on all new tables
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email()
  );
END;
$$;

CREATE OR REPLACE FUNCTION check_can_manage_roles()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email() AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- RLS Policies for class_bookings
CREATE POLICY "Users can view their own bookings"
  ON class_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON class_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON class_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create bookings"
  ON class_bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can manage all bookings"
  ON class_bookings FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for scheduled_classes
CREATE POLICY "Anyone can read scheduled classes"
  ON scheduled_classes FOR SELECT
  TO anon, authenticated
  USING (status IN ('scheduled', 'in_progress'));

CREATE POLICY "Admins can manage scheduled classes"
  ON scheduled_classes FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for waitlist
CREATE POLICY "Users can view their own waitlist entries"
  ON waitlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own waitlist entries"
  ON waitlist FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all waitlist entries"
  ON waitlist FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for class_packages
CREATE POLICY "Anyone can read active packages"
  ON class_packages FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage packages"
  ON class_packages FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for user_packages
CREATE POLICY "Users can view their own packages"
  ON user_packages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own packages"
  ON user_packages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user packages"
  ON user_packages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user packages"
  ON user_packages FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for instructor_availability
CREATE POLICY "Anyone can read instructor availability"
  ON instructor_availability FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

CREATE POLICY "Admins can manage all instructor availability"
  ON instructor_availability FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all referrals"
  ON referrals FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for payment_methods
CREATE POLICY "Users can manage their own payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- RLS Policies for class_feedback
CREATE POLICY "Users can manage their own feedback"
  ON class_feedback FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback"
  ON class_feedback FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- RLS Policies for user_activity
CREATE POLICY "Users can read their own activity"
  ON user_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity"
  ON user_activity FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read all activity"
  ON user_activity FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- RLS Policies for system_metrics
CREATE POLICY "Admins can manage system metrics"
  ON system_metrics FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for newsletter_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
  ON newsletter_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON newsletter_subscriptions FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- RLS Policies for newsletters
CREATE POLICY "Admins can manage newsletters"
  ON newsletters FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for roles
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (check_can_manage_roles())
  WITH CHECK (check_can_manage_roles());

-- RLS Policies for user_roles
CREATE POLICY "Users can read their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (check_is_admin());

CREATE POLICY "Super admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (check_can_manage_roles())
  WITH CHECK (check_can_manage_roles());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS class_bookings_user_id_idx ON class_bookings(user_id);
CREATE INDEX IF NOT EXISTS class_bookings_scheduled_class_id_idx ON class_bookings(scheduled_class_id);
CREATE INDEX IF NOT EXISTS class_bookings_booking_status_idx ON class_bookings(booking_status);
CREATE INDEX IF NOT EXISTS class_bookings_payment_status_idx ON class_bookings(payment_status);

CREATE INDEX IF NOT EXISTS scheduled_classes_instructor_id_idx ON scheduled_classes(instructor_id);
CREATE INDEX IF NOT EXISTS scheduled_classes_start_time_idx ON scheduled_classes(start_time);
CREATE INDEX IF NOT EXISTS scheduled_classes_status_idx ON scheduled_classes(status);

CREATE INDEX IF NOT EXISTS waitlist_class_position_idx ON waitlist(scheduled_class_id, position);

CREATE INDEX IF NOT EXISTS user_packages_user_active_idx ON user_packages(user_id, is_active);

CREATE INDEX IF NOT EXISTS instructor_availability_instructor_day_idx ON instructor_availability(instructor_id, day_of_week);

CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);

CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);

CREATE INDEX IF NOT EXISTS class_feedback_scheduled_class_id_idx ON class_feedback(scheduled_class_id);
CREATE INDEX IF NOT EXISTS class_feedback_instructor_rating_idx ON class_feedback(instructor_rating);

CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_activity_type_idx ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON user_activity(created_at);

CREATE INDEX IF NOT EXISTS system_metrics_metric_name_idx ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS system_metrics_period_idx ON system_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS newsletter_subscriptions_user_id_idx ON newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS newsletter_subscriptions_email_idx ON newsletter_subscriptions(email);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_class_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_scheduled_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_class_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_instructor_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_newsletters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_class_bookings_updated_at
  BEFORE UPDATE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_bookings_updated_at();

CREATE TRIGGER update_scheduled_classes_updated_at
  BEFORE UPDATE ON scheduled_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_classes_updated_at();

CREATE TRIGGER update_class_packages_updated_at
  BEFORE UPDATE ON class_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_class_packages_updated_at();

CREATE TRIGGER update_user_packages_updated_at
  BEFORE UPDATE ON user_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_packages_updated_at();

CREATE TRIGGER update_instructor_availability_updated_at
  BEFORE UPDATE ON instructor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_availability_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletters_updated_at();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- Business logic functions
CREATE OR REPLACE FUNCTION update_class_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE scheduled_classes 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM class_bookings 
      WHERE scheduled_class_id = NEW.scheduled_class_id 
        AND booking_status = 'confirmed'
    )
    WHERE id = NEW.scheduled_class_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE scheduled_classes 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM class_bookings 
      WHERE scheduled_class_id = NEW.scheduled_class_id 
        AND booking_status = 'confirmed'
    )
    WHERE id = NEW.scheduled_class_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE scheduled_classes 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM class_bookings 
      WHERE scheduled_class_id = OLD.scheduled_class_id 
        AND booking_status = 'confirmed'
    )
    WHERE id = OLD.scheduled_class_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for participant count
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

-- Waitlist promotion function
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist_entry RECORD;
BEGIN
  -- Only promote if a booking was cancelled
  IF TG_OP = 'UPDATE' AND OLD.booking_status = 'confirmed' AND NEW.booking_status = 'cancelled' THEN
    -- Find the next person on the waitlist
    SELECT * INTO next_waitlist_entry
    FROM waitlist 
    WHERE scheduled_class_id = NEW.scheduled_class_id
    ORDER BY position ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Create a booking for the waitlisted person
      INSERT INTO class_bookings (
        user_id, scheduled_class_id, first_name, last_name, email, phone,
        booking_status, payment_status
      ) VALUES (
        next_waitlist_entry.user_id,
        next_waitlist_entry.scheduled_class_id,
        'Waitlist', 'User', -- These should be updated with actual user data
        next_waitlist_entry.email,
        next_waitlist_entry.phone,
        'confirmed',
        'pending'
      );
      
      -- Remove from waitlist
      DELETE FROM waitlist WHERE id = next_waitlist_entry.id;
      
      -- Update positions for remaining waitlist entries
      UPDATE waitlist 
      SET position = position - 1
      WHERE scheduled_class_id = NEW.scheduled_class_id
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

-- Auto-add to waitlist function
CREATE OR REPLACE FUNCTION auto_add_to_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  class_full BOOLEAN;
  next_position INTEGER;
BEGIN
  -- Check if class is full
  SELECT 
    current_participants >= max_participants INTO class_full
  FROM scheduled_classes 
  WHERE id = NEW.scheduled_class_id;
  
  IF class_full THEN
    -- Get next waitlist position
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
    FROM waitlist 
    WHERE scheduled_class_id = NEW.scheduled_class_id;
    
    -- Add to waitlist instead of booking
    INSERT INTO waitlist (
      user_id, scheduled_class_id, position, email, phone
    ) VALUES (
      NEW.user_id, NEW.scheduled_class_id, next_position, NEW.email, NEW.phone
    );
    
    -- Prevent the booking from being created
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('user', 'Regular platform user'),
  ('instructor', 'Yoga instructor'),
  ('admin', 'Platform administrator'),
  ('super_admin', 'Super administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Insert sample class packages
INSERT INTO class_packages (name, description, class_count, price, validity_days) VALUES
  ('Starter Pack', '5 classes to get you started', 5, 100.00, 60),
  ('Monthly Pack', '10 classes per month', 10, 180.00, 30),
  ('Unlimited Monthly', 'Unlimited classes for one month', 999, 250.00, 30),
  ('Annual Pack', '100 classes valid for one year', 100, 1500.00, 365)
ON CONFLICT DO NOTHING;

-- Create user retention analytics view
CREATE OR REPLACE VIEW user_retention_analytics AS
WITH user_cohorts AS (
  SELECT 
    date_trunc('month', u.created_at) as signup_month,
    u.id as user_id,
    u.created_at
  FROM auth.users u
),
booking_activity AS (
  SELECT 
    cb.user_id,
    date_trunc('month', cb.created_at) as booking_month
  FROM class_bookings cb
  WHERE cb.booking_status = 'confirmed'
),
cohort_data AS (
  SELECT 
    uc.signup_month,
    COUNT(DISTINCT uc.user_id) as cohort_size,
    ba.booking_month,
    COUNT(DISTINCT ba.user_id) as users,
    ROUND(
      (date_part('year', ba.booking_month) - date_part('year', uc.signup_month)) * 12 +
      (date_part('month', ba.booking_month) - date_part('month', uc.signup_month))
    ) as months_since_signup
  FROM user_cohorts uc
  LEFT JOIN booking_activity ba ON uc.user_id = ba.user_id
  WHERE ba.booking_month IS NOT NULL
  GROUP BY uc.signup_month, ba.booking_month
)
SELECT 
  signup_month,
  cohort_size,
  booking_month,
  users,
  ROUND((users::numeric / cohort_size::numeric) * 100, 2) as retention_rate,
  months_since_signup
FROM cohort_data
ORDER BY signup_month, months_since_signup;

-- Grant permissions
GRANT SELECT ON user_retention_analytics TO authenticated;