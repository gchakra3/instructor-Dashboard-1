/*
  # Add Payment Integration Support

  1. New Tables
    - `payment_methods` - Store user payment methods
    - `transactions` - Track all payment transactions
    - `subscription_plans` - Define subscription offerings
    - `user_subscriptions` - Track user subscriptions

  2. Security
    - Proper RLS policies for financial data
    - Audit trail for all transactions
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'quarterly', 'yearly')),
  class_credits integer, -- null for unlimited
  features jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subscription_plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  credits_remaining integer,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  booking_id uuid REFERENCES class_bookings(id),
  subscription_id uuid REFERENCES user_subscriptions(id),
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  transaction_type text NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'subscription', 'credit')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  payment_method text,
  description text,
  metadata jsonb DEFAULT '{}',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create payment_methods table (for storing user payment preferences)
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  stripe_payment_method_id text NOT NULL,
  type text NOT NULL, -- 'card', 'bank_account', etc.
  last_four text,
  brand text, -- 'visa', 'mastercard', etc.
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans
CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Policies for user_subscriptions
CREATE POLICY "Users can read their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON user_subscriptions
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Policies for transactions
CREATE POLICY "Users can read their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

CREATE POLICY "System can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policies for payment_methods
CREATE POLICY "Users can manage their own payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at);
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);

-- Update triggers
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, description, price, billing_interval, class_credits, features) VALUES
  ('Basic Monthly', 'Perfect for beginners', 29.99, 'monthly', 4, '{"priority_booking": false, "recorded_sessions": false}'),
  ('Premium Monthly', 'For regular practitioners', 49.99, 'monthly', 8, '{"priority_booking": true, "recorded_sessions": true, "1on1_sessions": 1}'),
  ('Unlimited Monthly', 'Unlimited access to all classes', 79.99, 'monthly', null, '{"priority_booking": true, "recorded_sessions": true, "1on1_sessions": 2}'),
  ('Annual Premium', 'Best value for committed yogis', 499.99, 'yearly', null, '{"priority_booking": true, "recorded_sessions": true, "1on1_sessions": 24, "discount": "2_months_free"}');

-- Function to check user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid uuid)
RETURNS TABLE (
  has_active_subscription boolean,
  credits_remaining integer,
  subscription_type text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN us.id IS NOT NULL THEN true ELSE false END as has_active_subscription,
    us.credits_remaining,
    sp.name as subscription_type,
    us.current_period_end as expires_at
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.subscription_plan_id = sp.id
  WHERE us.user_id = user_uuid
  AND us.status = 'active'
  AND us.current_period_end > now()
  ORDER BY us.current_period_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;