/*
  # Add required tables with fixed function definitions
  
  1. Changes
    - Define check_is_admin() function before using it in policies
    - Create all tables with proper references
    - Add consistent RLS policies
    - Insert sample data
  
  2. Security
    - Fix function definitions
    - Drop existing policies before recreating them
*/

-- Create helper function first, before using it in policies
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

-- Create class_types table
CREATE TABLE IF NOT EXISTS class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  difficulty_level text DEFAULT 'beginner',
  price decimal(10,2) DEFAULT 0.00,
  duration_minutes integer DEFAULT 60,
  max_participants integer DEFAULT 20,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active class types" ON class_types;
DROP POLICY IF EXISTS "Admins can manage class types" ON class_types;

CREATE POLICY "Anyone can read active class types"
  ON class_types
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage class types"
  ON class_types
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create instructors table
CREATE TABLE IF NOT EXISTS instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  email text UNIQUE,
  phone text,
  specialties text[],
  experience_years integer DEFAULT 0,
  certification text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active instructors" ON instructors;
DROP POLICY IF EXISTS "Admins can manage instructors" ON instructors;

CREATE POLICY "Anyone can read active instructors"
  ON instructors
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage instructors"
  ON instructors
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  billing_interval text DEFAULT 'monthly', -- monthly, yearly
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;

CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE,
  status text DEFAULT 'active', -- active, cancelled, expired
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON user_subscriptions;

CREATE POLICY "Users can read their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method text,
  stripe_payment_intent_id text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;

CREATE POLICY "Users can read their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create class_schedules table (referenced in useClassSchedule hook)
CREATE TABLE IF NOT EXISTS class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id uuid REFERENCES class_types(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES instructors(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  duration_minutes integer DEFAULT 60,
  max_participants integer DEFAULT 20,
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active class schedules" ON class_schedules;
DROP POLICY IF EXISTS "Admins can manage class schedules" ON class_schedules;

CREATE POLICY "Anyone can read active class schedules"
  ON class_schedules
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage class schedules"
  ON class_schedules
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create get_user_profiles_for_admin function
CREATE OR REPLACE FUNCTION get_user_profiles_for_admin()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  bio text,
  experience_level text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  user_created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT check_is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.phone,
    p.bio,
    COALESCE(p.role, 'user') as experience_level,
    p.created_at,
    p.updated_at,
    p.email,
    u.created_at as user_created_at
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Profiles table not found, returning empty result';
    RETURN;
END;
$$;

-- Create admin_dashboard_metrics view
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
WITH metrics AS (
  SELECT 'total_users' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM auth.users
  
  UNION ALL
  
  SELECT 'total_bookings' as metric, 
         (SELECT COUNT(*) FROM bookings)::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'monthly_bookings' as metric, 
         (SELECT COUNT(*) FROM bookings 
          WHERE created_at >= date_trunc('month', CURRENT_DATE))::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'total_articles' as metric, 
         (SELECT COUNT(*) FROM articles)::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'monthly_articles' as metric, 
         (SELECT COUNT(*) FROM articles 
          WHERE created_at >= date_trunc('month', CURRENT_DATE))::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'total_queries' as metric, 
         (SELECT COUNT(*) FROM yoga_queries)::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'monthly_queries' as metric, 
         (SELECT COUNT(*) FROM yoga_queries 
          WHERE created_at >= date_trunc('month', CURRENT_DATE))::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'total_contacts' as metric, 
         (SELECT COUNT(*) FROM contact_messages)::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'monthly_contacts' as metric, 
         (SELECT COUNT(*) FROM contact_messages 
          WHERE created_at >= date_trunc('month', CURRENT_DATE))::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'monthly_revenue' as metric, 
         (SELECT COALESCE(SUM(amount), 0) FROM transactions
          WHERE status = 'completed' 
          AND created_at >= date_trunc('month', CURRENT_DATE))::bigint as value, 
         'currency' as type
  
  UNION ALL
  
  SELECT 'total_revenue' as metric, 
         (SELECT COALESCE(SUM(amount), 0) FROM transactions
          WHERE status = 'completed')::bigint as value, 
         'currency' as type
  
  UNION ALL
  
  SELECT 'active_subscriptions' as metric, 
         (SELECT COUNT(*) FROM user_subscriptions
          WHERE status = 'active')::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'total_subscriptions' as metric, 
         (SELECT COUNT(*) FROM user_subscriptions)::bigint as value, 
         'count' as type
  
  UNION ALL
  
  SELECT 'user_growth_rate' as metric, 0::bigint as value, 'percentage' as type
)
SELECT 
  metric,
  value,
  type,
  now() as last_updated
FROM metrics;

-- Create user_engagement_metrics view
CREATE OR REPLACE VIEW user_engagement_metrics AS
WITH user_stats AS (
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    (SELECT COUNT(*) FROM bookings b WHERE b.user_id = p.user_id) as total_bookings,
    (SELECT COUNT(*) FROM bookings b WHERE b.user_id = p.user_id AND b.status = 'attended') as attended_classes,
    (SELECT COUNT(*) FROM article_views av WHERE av.fingerprint = p.user_id::text) as articles_viewed,
    GREATEST(
      COALESCE((SELECT MAX(created_at) FROM bookings WHERE user_id = p.user_id), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(viewed_at) FROM article_views WHERE fingerprint = p.user_id::text), '1970-01-01'::timestamptz),
      p.updated_at
    ) as last_activity
  FROM profiles p
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

-- Insert some sample data
INSERT INTO class_types (name, description, difficulty_level, price, duration_minutes) VALUES
('Hatha Yoga', 'Gentle yoga focusing on basic postures and breathing', 'beginner', 25.00, 60),
('Vinyasa Flow', 'Dynamic yoga linking breath with movement', 'intermediate', 30.00, 75),
('Ashtanga Yoga', 'Traditional and physically demanding yoga practice', 'advanced', 35.00, 90),
('Yin Yoga', 'Slow-paced yoga with long-held poses', 'beginner', 25.00, 60),
('Hot Yoga', 'Yoga practiced in a heated room', 'intermediate', 32.00, 60)
ON CONFLICT DO NOTHING;

INSERT INTO instructors (name, bio, email, specialties, experience_years) VALUES
('Sarah Johnson', 'Certified yoga instructor with 8 years of experience in Hatha and Vinyasa styles.', 'sarah@yogastudio.com', ARRAY['Hatha', 'Vinyasa'], 8),
('Michael Chen', 'Ashtanga specialist and meditation teacher with 12 years of practice.', 'michael@yogastudio.com', ARRAY['Ashtanga', 'Meditation'], 12),
('Emma Williams', 'Yin yoga and restorative yoga expert focusing on healing and relaxation.', 'emma@yogastudio.com', ARRAY['Yin', 'Restorative'], 6),
('David Rodriguez', 'Hot yoga instructor and breathwork facilitator.', 'david@yogastudio.com', ARRAY['Hot Yoga', 'Breathwork'], 10)
ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (name, description, price, billing_interval) VALUES
('Basic Monthly', 'Access to 8 classes per month', 89.00, 'monthly'),
('Unlimited Monthly', 'Unlimited access to all classes', 149.00, 'monthly'),
('Basic Annual', 'Access to 8 classes per month (annual billing)', 890.00, 'yearly'),
('Unlimited Annual', 'Unlimited access to all classes (annual billing)', 1490.00, 'yearly')
ON CONFLICT DO NOTHING;

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_class_types_updated_at') THEN
        CREATE TRIGGER update_class_types_updated_at
            BEFORE UPDATE ON class_types
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_instructors_updated_at') THEN
        CREATE TRIGGER update_instructors_updated_at
            BEFORE UPDATE ON instructors
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscription_plans_updated_at') THEN
        CREATE TRIGGER update_subscription_plans_updated_at
            BEFORE UPDATE ON subscription_plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_subscriptions_updated_at') THEN
        CREATE TRIGGER update_user_subscriptions_updated_at
            BEFORE UPDATE ON user_subscriptions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transactions_updated_at') THEN
        CREATE TRIGGER update_transactions_updated_at
            BEFORE UPDATE ON transactions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_class_schedules_updated_at') THEN
        CREATE TRIGGER update_class_schedules_updated_at
            BEFORE UPDATE ON class_schedules
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Grant permissions
GRANT SELECT ON admin_dashboard_metrics TO authenticated;
GRANT SELECT ON user_engagement_metrics TO authenticated;