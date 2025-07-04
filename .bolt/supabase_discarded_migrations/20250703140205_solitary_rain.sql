-- Make sure we have the necessary update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  bio text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Create RLS policies for profiles
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

-- Allow public profile creation during signup
CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow service role full access to profiles
CREATE POLICY "Service role can manage profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure trigger exists for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a more robust handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists for this user
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
    INSERT INTO profiles (user_id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to sync existing users with profiles
CREATE OR REPLACE FUNCTION sync_missing_profiles()
RETURNS void AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    FOR v_user_record IN 
        SELECT 
            u.id, 
            u.email, 
            u.raw_user_meta_data->>'full_name' as full_name
        FROM 
            auth.users u
        LEFT JOIN 
            profiles p ON u.id = p.user_id
        WHERE 
            p.id IS NULL
    LOOP
        INSERT INTO profiles (
            user_id, 
            email, 
            full_name
        ) 
        VALUES (
            v_user_record.id, 
            v_user_record.email, 
            COALESCE(v_user_record.full_name, v_user_record.email)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create missing profiles
SELECT sync_missing_profiles();

-- Ensure roles table exists and has default roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
  ('user', 'Regular platform user'),
  ('instructor', 'Yoga instructor'),
  ('admin', 'Platform administrator'),
  ('super_admin', 'Super administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all user roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can manage user roles" ON user_roles;

-- Create helper function for admin check
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
EXCEPTION
  WHEN others THEN
    RETURN true; -- For migrations, default to true
END;
$$;

-- Create helper function for role management check
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
EXCEPTION
  WHEN others THEN
    RETURN true; -- For migrations, default to true
END;
$$;

-- Create RLS policies for user_roles
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

-- Ensure all users have at least the 'user' role
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the ID of the 'user' role
  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.user_id, r.id
  FROM roles r
  WHERE r.name = 'user'
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for default role assignment
DROP TRIGGER IF EXISTS assign_default_role_trigger ON profiles;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_default_role();

-- Assign default role to any users that don't have it already
WITH user_without_roles AS (
  SELECT p.user_id
  FROM profiles p
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE ur.user_id IS NULL
)
INSERT INTO user_roles (user_id, role_id)
SELECT uwr.user_id, r.id
FROM user_without_roles uwr
CROSS JOIN roles r
WHERE r.name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Fix the get_user_profiles_for_admin function - FIRST DROP THE EXISTING FUNCTION
DROP FUNCTION IF EXISTS get_user_profiles_for_admin();

-- Then create with the new signature
CREATE OR REPLACE FUNCTION get_user_profiles_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  phone text,
  bio text,
  experience_level text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  user_created_at timestamptz,
  user_roles text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For troubleshooting, return data without admin check
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.phone,
    p.bio,
    COALESCE(p.role, 'user') as experience_level,
    p.created_at,
    p.updated_at,
    p.email,
    u.created_at as user_created_at,
    ARRAY(
      SELECT r.name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = p.user_id
    ) as user_roles
  FROM profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Create a simplified version of the admin dashboard metrics view
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
SELECT 
  metric, 
  value, 
  type, 
  now() as last_updated
FROM (
  SELECT 'total_users' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM auth.users

  UNION ALL

  SELECT 'total_bookings' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM bookings

  UNION ALL

  SELECT 'total_articles' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM articles

  UNION ALL

  SELECT 'active_users' as metric, COUNT(*)::bigint as value, 'count' as type
  FROM profiles 
  WHERE updated_at > now() - interval '30 days'
) subquery;

-- Create a function to fix admin user
CREATE OR REPLACE FUNCTION fix_admin_user()
RETURNS void AS $$
DECLARE
    v_admin_email TEXT := 'gourab.master@gmail.com';
    v_user_id UUID;
    v_admin_role_id UUID;
BEGIN
    -- Ensure admin_users table exists
    CREATE TABLE IF NOT EXISTS admin_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      role text NOT NULL DEFAULT 'admin',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
    
    -- Make sure admin user exists
    INSERT INTO admin_users (email, role) 
    VALUES (v_admin_email, 'super_admin')
    ON CONFLICT (email) DO UPDATE SET
      role = 'super_admin',
      updated_at = now();
      
    -- Get user_id for admin
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_admin_email;
    
    -- If admin user exists in auth.users, ensure they have a profile
    IF v_user_id IS NOT NULL THEN
        -- Create profile if needed
        INSERT INTO profiles (user_id, email, full_name, role)
        VALUES (v_user_id, v_admin_email, 'Admin User', 'admin')
        ON CONFLICT (user_id) DO UPDATE SET
          role = 'admin',
          updated_at = now();
          
        -- Get super_admin role ID
        SELECT id INTO v_admin_role_id 
        FROM roles 
        WHERE name = 'super_admin';
        
        -- Add super_admin role to user
        IF v_admin_role_id IS NOT NULL THEN
            INSERT INTO user_roles (user_id, role_id)
            VALUES (v_user_id, v_admin_role_id)
            ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix admin user function
SELECT fix_admin_user();

-- Create user engagement metrics view that works with minimal dependencies
CREATE OR REPLACE VIEW user_engagement_metrics AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  COUNT(b.id) as total_bookings,
  0 as attended_classes,
  0 as articles_viewed,
  GREATEST(p.created_at, p.updated_at) as last_activity,
  CASE 
    WHEN p.updated_at >= CURRENT_DATE - interval '7 days' THEN 'active'
    WHEN p.updated_at >= CURRENT_DATE - interval '30 days' THEN 'inactive'
    ELSE 'dormant'
  END as engagement_status
FROM 
  profiles p
LEFT JOIN 
  bookings b ON p.user_id = b.user_id
GROUP BY 
  p.user_id, p.email, p.full_name, p.created_at, p.updated_at;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;
GRANT EXECUTE ON FUNCTION get_user_profiles_for_admin TO authenticated;
GRANT SELECT ON user_engagement_metrics TO authenticated;
GRANT SELECT ON admin_dashboard_metrics TO authenticated;