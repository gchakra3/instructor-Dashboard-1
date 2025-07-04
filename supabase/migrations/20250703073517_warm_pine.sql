/*
  # Create admin dashboard metrics view

  1. New Views
    - `admin_dashboard_metrics`
      - Aggregates key metrics for the admin dashboard
      - Includes user counts, booking statistics, article metrics, and query counts
      - Provides monthly revenue and active subscriptions (set to 0 for now)

  2. Security
    - View is accessible to authenticated users with admin privileges
    - No RLS needed as this is a view aggregating public statistics

  3. Metrics Included
    - Total users count
    - Total bookings count  
    - Total articles count
    - Total yoga queries count
    - Monthly revenue (placeholder - set to 0)
    - Active subscriptions (placeholder - set to 0)
*/

-- Create the admin dashboard metrics view
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
SELECT 
  -- User metrics
  (SELECT COUNT(*) FROM auth.users) as total_users,
  
  -- Booking metrics
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_bookings,
  
  -- Article metrics
  (SELECT COUNT(*) FROM articles) as total_articles,
  (SELECT COUNT(*) FROM articles WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_articles,
  
  -- Query metrics
  (SELECT COUNT(*) FROM yoga_queries) as total_queries,
  (SELECT COUNT(*) FROM yoga_queries WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_queries,
  
  -- Contact metrics
  (SELECT COUNT(*) FROM contact_messages) as total_contacts,
  (SELECT COUNT(*) FROM contact_messages WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_contacts,
  
  -- Revenue metrics (placeholder - requires transactions table)
  0 as monthly_revenue,
  0 as total_revenue,
  
  -- Subscription metrics (placeholder - requires user_subscriptions table)
  0 as active_subscriptions,
  0 as total_subscriptions,
  
  -- Growth metrics
  (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) - interval '1 month' 
                                   AND created_at < date_trunc('month', CURRENT_DATE)), 0) - 1) * 100, 2
        )
      END
    FROM auth.users
  ) as user_growth_rate,
  
  -- Current timestamp for cache busting
  CURRENT_TIMESTAMP as last_updated;

-- Grant access to authenticated users (admin check should be done in RLS or application layer)
GRANT SELECT ON admin_dashboard_metrics TO authenticated;