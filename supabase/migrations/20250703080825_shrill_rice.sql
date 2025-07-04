/*
  # Database Reset Migration
  
  This migration resets the database to a clean state and rebuilds all necessary tables,
  views, functions, and policies from scratch.
  
  1. Drop all existing tables and views
  2. Recreate core tables with proper structure
  3. Set up RLS policies
  4. Create admin functionality
  5. Insert sample data
*/

-- Drop all existing tables and views (in correct order to handle dependencies)
DROP VIEW IF EXISTS user_engagement_metrics CASCADE;
DROP VIEW IF EXISTS admin_dashboard_metrics CASCADE;

DROP TABLE IF EXISTS class_schedules CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS instructors CASCADE;
DROP TABLE IF EXISTS class_types CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS article_views CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS yoga_queries CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_profiles_for_admin() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_admin_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_articles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_article_view_count() CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  bio text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create admin_users table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_access" ON admin_users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read" ON admin_users
  FOR SELECT TO authenticated
  USING (true);

-- Create is_admin function
CREATE OR REPLACE FUNCTION is_admin()
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

-- Create bookings table
CREATE TABLE bookings (
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

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create yoga_queries table
CREATE TABLE yoga_queries (
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

ALTER TABLE yoga_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create yoga queries"
  ON yoga_queries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own queries"
  ON yoga_queries FOR SELECT
  TO authenticated
  USING (email = auth.email());

CREATE POLICY "Admins can view all queries"
  ON yoga_queries FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage all queries"
  ON yoga_queries FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create contact_messages table
CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create contact messages"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage all contact messages"
  ON contact_messages FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create articles table
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  preview_text text NOT NULL,
  image_url text,
  video_url text,
  category text DEFAULT 'general' NOT NULL,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'draft' NOT NULL,
  view_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published articles"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins can manage articles"
  ON articles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create article_views table
CREATE TABLE article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert article views"
  ON article_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read article views"
  ON article_views FOR SELECT
  TO authenticated
  USING (is_admin());

-- Create ratings table
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(article_id, fingerprint)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage their own ratings"
  ON ratings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create class_types table
CREATE TABLE class_types (
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
  ON class_types FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage class types"
  ON class_types FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create instructors table
CREATE TABLE instructors (
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
  ON instructors FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage instructors"
  ON instructors FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  billing_interval text DEFAULT 'monthly',
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions"
  ON user_subscriptions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  payment_method text,
  stripe_payment_intent_id text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create class_schedules table
CREATE TABLE class_schedules (
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
  ON class_schedules FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage class schedules"
  ON class_schedules FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create update functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_types_updated_at
  BEFORE UPDATE ON class_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at
  BEFORE UPDATE ON class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update article view count
CREATE OR REPLACE FUNCTION update_article_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE articles 
  SET view_count = (
    SELECT COUNT(*) 
    FROM article_views 
    WHERE article_id = NEW.article_id
  )
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_article_view_count_trigger
  AFTER INSERT ON article_views
  FOR EACH ROW
  EXECUTE FUNCTION update_article_view_count();

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
  IF NOT is_admin() THEN
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

-- Insert admin user
INSERT INTO admin_users (email, role) 
VALUES ('gourab.master@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();

-- Insert sample data
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

-- Insert sample articles
INSERT INTO articles (
  title,
  content,
  preview_text,
  image_url,
  category,
  tags,
  status,
  published_at
) VALUES 
(
  'Getting Started with Yoga: A Beginner''s Guide',
  '<h2>Welcome to Your Yoga Journey</h2><p>Starting a yoga practice can feel overwhelming, but it doesn''t have to be. This comprehensive guide will walk you through everything you need to know to begin your yoga journey with confidence.</p><h3>What is Yoga?</h3><p>Yoga is an ancient practice that combines physical postures, breathing techniques, and meditation to promote physical and mental well-being. The word "yoga" comes from the Sanskrit word "yuj," which means to unite or join.</p><h3>Benefits of Regular Practice</h3><ul><li>Improved flexibility and strength</li><li>Better posture and balance</li><li>Reduced stress and anxiety</li><li>Enhanced focus and concentration</li><li>Better sleep quality</li></ul><h3>Getting Started</h3><p>Begin with basic poses and focus on proper alignment. Remember, yoga is not about perfection—it''s about progress and self-awareness.</p>',
  'Everything you need to know to start your yoga journey, from basic poses to breathing techniques.',
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'beginner',
  ARRAY['beginner', 'basics', 'getting-started'],
  'published',
  now()
),
(
  'Yoga for Busy Professionals: Quick Desk Stretches',
  '<h2>Yoga at Your Desk</h2><p>Long hours at a desk can lead to tension, stiffness, and poor posture. These simple yoga stretches can be done right at your workspace to help you feel more energized and focused.</p><h3>Neck and Shoulder Release</h3><p>Gently roll your shoulders back and forth, then slowly turn your head from side to side. Hold each position for 15-30 seconds.</p><h3>Seated Spinal Twist</h3><p>Sit tall in your chair, place your right hand on the back of your chair, and gently twist to the right. Hold for 30 seconds, then repeat on the left side.</p><h3>Desk Downward Dog</h3><p>Place your hands on your desk, step back, and create an inverted V shape with your body. This helps stretch your back and shoulders.</p>',
  'Simple yoga stretches you can do at your desk to reduce tension and improve focus during busy workdays.',
  'https://images.pexels.com/photos/3823495/pexels-photo-3823495.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'corporate',
  ARRAY['corporate', 'desk-yoga', 'workplace-wellness'],
  'published',
  now()
),
(
  'The Science of Breathing: Pranayama Techniques',
  '<h2>The Power of Breath</h2><p>Pranayama, or breath control, is one of the most powerful tools in yoga. These techniques can help reduce stress, improve focus, and enhance overall well-being.</p><h3>Basic Breathing Techniques</h3><h4>1. Deep Belly Breathing</h4><p>Place one hand on your chest and one on your belly. Breathe slowly and deeply, ensuring your belly rises more than your chest.</p><h4>2. 4-7-8 Breathing</h4><p>Inhale for 4 counts, hold for 7 counts, and exhale for 8 counts. This technique is excellent for relaxation and sleep.</p><h4>3. Alternate Nostril Breathing</h4><p>Use your thumb to close your right nostril, inhale through the left. Then close the left nostril with your ring finger and exhale through the right.</p>',
  'Learn powerful breathing techniques that can transform your stress levels and enhance your yoga practice.',
  'https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'wellness',
  ARRAY['breathing', 'pranayama', 'stress-relief'],
  'published',
  now()
)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS articles_status_idx ON articles(status);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles(published_at);
CREATE INDEX IF NOT EXISTS article_views_article_id_idx ON article_views(article_id);
CREATE INDEX IF NOT EXISTS article_views_fingerprint_idx ON article_views(fingerprint);
CREATE INDEX IF NOT EXISTS ratings_article_id_idx ON ratings(article_id);
CREATE INDEX IF NOT EXISTS ratings_fingerprint_idx ON ratings(fingerprint);

-- Grant permissions
GRANT SELECT ON admin_dashboard_metrics TO authenticated;
GRANT SELECT ON user_engagement_metrics TO authenticated;