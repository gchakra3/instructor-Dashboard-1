/*
  # Enhance Yoga Platform with Advanced Features

  1. New Tables
    - `business_settings` - Store configurable business settings
    - `form_submissions` - Generic form submission handler
    - `newsletter_subscribers` - Newsletter subscription management
    - Enhanced enum types for better data consistency

  2. Enhanced Features
    - Business settings management
    - Form submission tracking
    - Newsletter management
    - Better data validation with enums

  3. Security
    - Proper RLS policies for all new tables
    - Admin and public access controls
*/

-- Create enum types for better data consistency
DO $$ BEGIN
    CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_type AS ENUM ('booking', 'query', 'contact', 'corporate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'instructor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create business_settings table for configurable settings
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create form_submissions table for generic form handling
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type submission_type NOT NULL,
  data jsonb NOT NULL,
  user_email text,
  user_name text,
  user_phone text,
  status text DEFAULT 'new',
  notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  status text DEFAULT 'active'
);

-- Enable RLS on new tables
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Update articles table to use enum
DO $$ BEGIN
    ALTER TABLE articles ALTER COLUMN status TYPE post_status USING status::post_status;
EXCEPTION
    WHEN invalid_text_representation THEN
        -- Handle existing data that doesn't match enum values
        UPDATE articles SET status = 'draft' WHERE status NOT IN ('draft', 'published', 'archived');
        ALTER TABLE articles ALTER COLUMN status TYPE post_status USING status::post_status;
END $$;

-- RLS Policies for business_settings
CREATE POLICY "Anyone can read business settings"
  ON business_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage business settings"
  ON business_settings FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for form_submissions
CREATE POLICY "Users can create submissions"
  ON form_submissions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public users can create submissions"
  ON form_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can manage all submissions"
  ON form_submissions FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can manage newsletter subscribers"
  ON newsletter_subscribers FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS business_settings_key_idx ON business_settings(key);
CREATE INDEX IF NOT EXISTS form_submissions_type_idx ON form_submissions(type);
CREATE INDEX IF NOT EXISTS form_submissions_status_idx ON form_submissions(status);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON newsletter_subscribers(status);

-- Insert default business settings
INSERT INTO business_settings (key, value, description) VALUES
  ('site_name', '"Yogodyaan"', 'Website name'),
  ('contact_email', '"hello@yogodyaan.com"', 'Primary contact email'),
  ('contact_phone', '"+1 (555) 123-4567"', 'Primary contact phone'),
  ('business_hours', '{"monday": "6:00 AM - 10:00 PM", "tuesday": "6:00 AM - 10:00 PM", "wednesday": "6:00 AM - 10:00 PM", "thursday": "6:00 AM - 10:00 PM", "friday": "6:00 AM - 10:00 PM", "saturday": "8:00 AM - 8:00 PM", "sunday": "8:00 AM - 8:00 PM"}', 'Business operating hours'),
  ('social_media', '{"facebook": "", "instagram": "", "twitter": "", "youtube": ""}', 'Social media links'),
  ('booking_settings', '{"advance_booking_days": 30, "cancellation_hours": 2, "max_participants_default": 20}', 'Booking configuration'),
  ('email_settings', '{"welcome_email": true, "booking_confirmations": true, "reminders": true, "newsletters": true}', 'Email notification settings')
ON CONFLICT (key) DO NOTHING;

-- Create trigger for business_settings updated_at
CREATE OR REPLACE FUNCTION update_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_updated_at();

-- Enhanced admin dashboard metrics view
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
WITH metrics AS (
  SELECT 'total_users' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM auth.users
  
  UNION ALL
  
  SELECT 'total_bookings' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM bookings
  
  UNION ALL
  
  SELECT 'monthly_bookings' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM bookings
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  
  UNION ALL
  
  SELECT 'total_articles' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM articles
  
  UNION ALL
  
  SELECT 'monthly_articles' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM articles
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  
  UNION ALL
  
  SELECT 'total_queries' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM yoga_queries
  
  UNION ALL
  
  SELECT 'monthly_queries' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM yoga_queries
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  
  UNION ALL
  
  SELECT 'total_contacts' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM contact_messages
  
  UNION ALL
  
  SELECT 'monthly_contacts' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM contact_messages
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  
  UNION ALL
  
  SELECT 'total_submissions' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM form_submissions
  
  UNION ALL
  
  SELECT 'monthly_submissions' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM form_submissions
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  
  UNION ALL
  
  SELECT 'newsletter_subscribers' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM newsletter_subscribers
  WHERE status = 'active'
  
  UNION ALL
  
  SELECT 'monthly_revenue' as metric, 
         COALESCE(SUM(amount), 0)::bigint as value, 
         'currency' as type
  FROM transactions
  WHERE status = 'completed' 
    AND created_at >= date_trunc('month', CURRENT_DATE)
  
  UNION ALL
  
  SELECT 'total_revenue' as metric, 
         COALESCE(SUM(amount), 0)::bigint as value, 
         'currency' as type
  FROM transactions
  WHERE status = 'completed'
  
  UNION ALL
  
  SELECT 'active_subscriptions' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM user_subscriptions
  WHERE status = 'active'
  
  UNION ALL
  
  SELECT 'total_subscriptions' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM user_subscriptions
  
  UNION ALL
  
  SELECT 'user_growth_rate' as metric, 
         CASE 
           WHEN COUNT(*) = 0 THEN 0
           ELSE ROUND(
             (COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::numeric / 
              NULLIF(COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) - interval '1 month' 
                                      AND created_at < date_trunc('month', CURRENT_DATE)), 0) - 1) * 100, 2
           )
         END::bigint as value,
         'percentage' as type
  FROM auth.users
)
SELECT 
  metric,
  value,
  type,
  now() as last_updated
FROM metrics;

-- Enhanced user engagement metrics view
CREATE OR REPLACE VIEW user_engagement_metrics AS
WITH user_stats AS (
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'attended' THEN b.id END) as attended_classes,
    COUNT(DISTINCT av.id) as articles_viewed,
    GREATEST(
      MAX(b.created_at),
      MAX(av.viewed_at),
      MAX(p.updated_at)
    ) as last_activity
  FROM profiles p
  LEFT JOIN bookings b ON p.user_id = b.user_id
  LEFT JOIN article_views av ON p.user_id::text = av.fingerprint
  GROUP BY p.user_id, p.email, p.full_name
)
SELECT 
  user_id,
  email,
  full_name,
  total_bookings,
  attended_classes,
  articles_viewed,
  last_activity,
  CASE 
    WHEN last_activity >= CURRENT_DATE - interval '7 days' THEN 'active'
    WHEN last_activity >= CURRENT_DATE - interval '30 days' THEN 'inactive'
    ELSE 'dormant'
  END as engagement_status
FROM user_stats
WHERE user_id IS NOT NULL;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign default 'user' role to new users
  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.user_id, r.id
  FROM roles r
  WHERE r.name = 'user'
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for default role assignment
DROP TRIGGER IF EXISTS assign_default_role_trigger ON profiles;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_default_role();

-- Grant permissions
GRANT SELECT ON admin_dashboard_metrics TO authenticated;
GRANT SELECT ON user_engagement_metrics TO authenticated;