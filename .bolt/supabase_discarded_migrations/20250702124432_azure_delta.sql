/*
  # Fix Admin Dashboard Data Access (No Function Conflicts)

  1. New Tables
    - `roles` - Role definitions
    - `user_roles` - User role assignments  
    - `newsletter_subscriptions` - Email subscriptions
    - `newsletters` - Newsletter management

  2. Security
    - Add admin policies for existing tables without dropping functions
    - Create new helper functions with different names
    - Enable proper role-based access control

  3. Functions
    - Create new functions that don't conflict with existing ones
    - Add role checking capabilities
*/

-- Create helper functions with unique names to avoid conflicts
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_can_manage_roles()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.email() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create roles table for role-based access control
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin access policies for bookings (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Admins can view all bookings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all bookings"
      ON bookings
      FOR SELECT
      TO authenticated
      USING (check_is_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Admins can update bookings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update bookings"
      ON bookings
      FOR UPDATE
      TO authenticated
      USING (check_is_admin())';
  END IF;
END $$;

-- Add admin access policies for yoga_queries (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'yoga_queries' AND policyname = 'Admins can view all yoga queries'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all yoga queries"
      ON yoga_queries
      FOR SELECT
      TO authenticated
      USING (check_is_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'yoga_queries' AND policyname = 'Admins can update yoga queries'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update yoga queries"
      ON yoga_queries
      FOR UPDATE
      TO authenticated
      USING (check_is_admin())';
  END IF;
END $$;

-- Add admin access policies for contact_messages (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_messages' AND policyname = 'Admins can view all contact messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all contact messages"
      ON contact_messages
      FOR SELECT
      TO authenticated
      USING (check_is_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_messages' AND policyname = 'Admins can update contact messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update contact messages"
      ON contact_messages
      FOR UPDATE
      TO authenticated
      USING (check_is_admin())';
  END IF;
END $$;

-- Update articles policy for content management (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'articles' AND policyname = 'Content creators can manage articles'
  ) THEN
    EXECUTE 'CREATE POLICY "Content creators can manage articles"
      ON articles
      FOR ALL
      TO authenticated
      USING (has_role(''mantra_curator'') OR check_is_admin())
      WITH CHECK (has_role(''mantra_curator'') OR check_is_admin())';
  END IF;
END $$;

-- Policies for roles table
CREATE POLICY "Anyone can read roles"
  ON roles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (check_can_manage_roles())
  WITH CHECK (check_can_manage_roles());

-- Policies for user_roles table
CREATE POLICY "Users can read their own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all user roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

CREATE POLICY "Super admins can manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (check_can_manage_roles())
  WITH CHECK (check_can_manage_roles());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);

-- Create update triggers for roles table
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
  ('mantra_curator', 'Can create and manage learning content'),
  ('instructor', 'Yoga instructor with teaching privileges'),
  ('student', 'Regular student user')
ON CONFLICT (name) DO NOTHING;

-- Create newsletter subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  subscribed boolean DEFAULT true,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE(user_id, email)
);

-- Enable RLS on newsletter subscriptions
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for newsletter subscriptions
CREATE POLICY "Users can manage their own subscriptions"
  ON newsletter_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Create indexes for newsletter subscriptions
CREATE INDEX IF NOT EXISTS newsletter_subscriptions_user_id_idx ON newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS newsletter_subscriptions_email_idx ON newsletter_subscriptions(email);

-- Create newsletters table for admin to send newsletters
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

-- Enable RLS on newsletters
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- Policies for newsletters
CREATE POLICY "Admins can manage newsletters"
  ON newsletters
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Create update trigger for newsletters
CREATE OR REPLACE FUNCTION update_newsletters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletters_updated_at();