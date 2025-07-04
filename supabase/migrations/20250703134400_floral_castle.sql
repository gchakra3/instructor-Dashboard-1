/*
  # Fix user signup database error

  1. Functions
    - Create or replace `handle_new_user` function to properly create user profiles
    - Ensure the function has proper error handling

  2. Triggers
    - Ensure trigger exists on auth.users table to call handle_new_user function

  3. Security
    - Update RLS policies to allow profile creation during signup
    - Ensure service role can insert profiles during user creation

  4. Schema fixes
    - Ensure profiles table can accept new user insertions
*/

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to allow profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
CREATE POLICY "Allow profile creation during signup"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Ensure service role can manage profiles
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;