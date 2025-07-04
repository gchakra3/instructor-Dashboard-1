/*
  # Add Analytics and Reporting

  1. New Tables
    - `user_activity` - Track user engagement
    - `class_feedback` - Collect feedback after classes
    - `system_metrics` - Store system-wide metrics

  2. Views
    - Analytics dashboards for admins
    - User engagement metrics
    - Revenue reporting

  3. Functions
    - Generate reports
    - Calculate metrics
*/

-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL, -- 'login', 'class_booking', 'article_view', 'profile_update', etc.
  entity_type text, -- 'class', 'article', 'booking', etc.
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create class_feedback table
CREATE TABLE IF NOT EXISTS class_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES class_bookings(id),
  user_id uuid REFERENCES auth.users(id),
  scheduled_class_id uuid NOT NULL REFERENCES scheduled_classes(id),
  instructor_rating integer CHECK (instructor_rating >= 1 AND instructor_rating <= 5),
  class_rating integer CHECK (class_rating >= 1 AND class_rating <= 5),
  difficulty_rating integer CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  would_recommend boolean,
  feedback_text text,
  suggestions text,
  created_at timestamptz DEFAULT now()
);

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value decimal(15,2) NOT NULL,
  metric_type text NOT NULL, -- 'count', 'revenue', 'percentage', 'average'
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for user_activity
CREATE POLICY "Users can read their own activity"
  ON user_activity
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity"
  ON user_activity
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Admins can read all activity"
  ON user_activity
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Policies for class_feedback
CREATE POLICY "Users can manage their own feedback"
  ON class_feedback
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback"
  ON class_feedback
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Policies for system_metrics
CREATE POLICY "Admins can manage system metrics"
  ON system_metrics
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_activity_type_idx ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS class_feedback_scheduled_class_id_idx ON class_feedback(scheduled_class_id);
CREATE INDEX IF NOT EXISTS class_feedback_instructor_rating_idx ON class_feedback(instructor_rating);
CREATE INDEX IF NOT EXISTS system_metrics_metric_name_idx ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS system_metrics_period_idx ON system_metrics(period_start, period_end);

-- Create analytics views
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
SELECT 
  'total_users' as metric,
  COUNT(*) as value,
  'count' as type
FROM auth.users
WHERE created_at >= date_trunc('month', now())

UNION ALL

SELECT 
  'total_bookings' as metric,
  COUNT(*) as value,
  'count' as type
FROM class_bookings
WHERE created_at >= date_trunc('month', now())

UNION ALL

SELECT 
  'monthly_revenue' as metric,
  COALESCE(SUM(amount), 0) as value,
  'currency' as type
FROM transactions
WHERE status = 'completed'
AND created_at >= date_trunc('month', now())

UNION ALL

SELECT 
  'active_subscriptions' as metric,
  COUNT(*) as value,
  'count' as type
FROM user_subscriptions
WHERE status = 'active'
AND current_period_end > now();

-- Create user engagement view
CREATE OR REPLACE VIEW user_engagement_metrics AS
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  COUNT(DISTINCT cb.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN cb.booking_status = 'attended' THEN cb.id END) as attended_classes,
  COUNT(DISTINCT av.id) as articles_viewed,
  MAX(ua.created_at) as last_activity,
  CASE 
    WHEN MAX(ua.created_at) > now() - interval '7 days' THEN 'active'
    WHEN MAX(ua.created_at) > now() - interval '30 days' THEN 'inactive'
    ELSE 'dormant'
  END as engagement_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN class_bookings cb ON u.id = cb.user_id
LEFT JOIN article_views av ON av.fingerprint = u.id::text -- simplified for this example
LEFT JOIN user_activity ua ON u.id = ua.user_id
GROUP BY u.id, u.email, p.full_name;

-- Create instructor performance view
CREATE OR REPLACE VIEW instructor_performance AS
SELECT 
  i.id as instructor_id,
  i.name as instructor_name,
  COUNT(DISTINCT sc.id) as total_classes_taught,
  COUNT(DISTINCT cb.id) as total_bookings,
  AVG(cf.instructor_rating) as avg_instructor_rating,
  AVG(cf.class_rating) as avg_class_rating,
  COUNT(DISTINCT cf.id) as total_feedback_received,
  SUM(CASE WHEN cf.would_recommend = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(cf.id), 0) * 100 as recommendation_percentage
FROM instructors i
LEFT JOIN scheduled_classes sc ON i.id = sc.instructor_id
LEFT JOIN class_bookings cb ON sc.id = cb.scheduled_class_id
LEFT JOIN class_feedback cf ON cb.id = cf.booking_id
WHERE sc.status = 'completed'
GROUP BY i.id, i.name;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_activity (
    user_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate monthly metrics
CREATE OR REPLACE FUNCTION calculate_monthly_metrics()
RETURNS void AS $$
DECLARE
  current_month_start timestamptz := date_trunc('month', now());
  current_month_end timestamptz := date_trunc('month', now()) + interval '1 month';
BEGIN
  -- Clear existing metrics for current month
  DELETE FROM system_metrics 
  WHERE period_start = current_month_start;
  
  -- Insert new metrics
  INSERT INTO system_metrics (metric_name, metric_value, metric_type, period_start, period_end)
  SELECT 
    'new_users',
    COUNT(*),
    'count',
    current_month_start,
    current_month_end
  FROM auth.users
  WHERE created_at >= current_month_start;
  
  INSERT INTO system_metrics (metric_name, metric_value, metric_type, period_start, period_end)
  SELECT 
    'total_bookings',
    COUNT(*),
    'count',
    current_month_start,
    current_month_end
  FROM class_bookings
  WHERE created_at >= current_month_start;
  
  INSERT INTO system_metrics (metric_name, metric_value, metric_type, period_start, period_end)
  SELECT 
    'revenue',
    COALESCE(SUM(amount), 0),
    'currency',
    current_month_start,
    current_month_end
  FROM transactions
  WHERE status = 'completed'
  AND created_at >= current_month_start;
  
  INSERT INTO system_metrics (metric_name, metric_value, metric_type, period_start, period_end)
  SELECT 
    'avg_class_rating',
    COALESCE(AVG(class_rating), 0),
    'average',
    current_month_start,
    current_month_end
  FROM class_feedback
  WHERE created_at >= current_month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;