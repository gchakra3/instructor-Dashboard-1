/*
  # Create missing tables, views, and functions for admin dashboard

  1. New Tables
    - `class_types` - Store yoga class type information
    - `instructors` - Store instructor information  
    - `subscription_plans` - Store subscription plan details
    - `user_subscriptions` - Store user subscription records
    - `transactions` - Store payment transaction records

  2. New Views
    - `admin_dashboard_metrics` - Aggregate dashboard metrics
    - `user_engagement_metrics` - User engagement analytics

  3. New Functions
    - `get_user_profiles_for_admin` - Fetch user profiles for admin view

  4. Security
    - Enable RLS on all new tables
    - Add appropriate policies for admin access
*/

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

CREATE POLICY "Anyone can read active class types"
  ON class_types
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage class types"
  ON class_types
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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

CREATE POLICY "Anyone can read active instructors"
  ON instructors
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage instructors"
  ON instructors
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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

CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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

CREATE POLICY "Users can read their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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

CREATE POLICY "Users can read their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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

CREATE POLICY "Anyone can read active class schedules"
  ON class_schedules
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage class schedules"
  ON class_schedules
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.phone,
    p.bio,
    COALESCE(p.role::text, 'user') as experience_level,
    p.created_at,
    p.updated_at,
    p.email,
    u.created_at as user_created_at
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Create admin_dashboard_metrics view
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
           WHEN LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', created_at)) = 0 THEN 0
           ELSE ROUND(
             ((COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', created_at))) * 100.0 / 
              LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', created_at)))::numeric, 2
           )::bigint
         END as value,
         'percentage' as type
  FROM auth.users
  WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at) DESC
  LIMIT 1
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