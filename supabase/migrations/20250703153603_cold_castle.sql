/*
  # Add Mantra Curator Role and Article Ownership

  1. Schema Changes
    - Add author_id column to articles table
    - Create mantra_curator role
    - Add RLS policies for article management by curators
  
  2. Functions
    - Add trigger to automatically set article author
    - Create is_mantra_curator() helper function
    
  3. Security
    - Allow curators to manage only their own articles
    - Maintain existing admin permissions
*/

-- First, add the author_id column to articles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'articles' AND column_name = 'author_id'
    ) THEN
        ALTER TABLE articles ADD COLUMN author_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Add the 'mantra_curator' role
INSERT INTO roles (name, description)
VALUES ('mantra_curator', 'Can create, edit, and delete their own articles')
ON CONFLICT (name) DO NOTHING;

-- Add RLS policy for mantra curators to manage their own articles
DROP POLICY IF EXISTS "Mantra curators can manage their own articles" ON articles;
CREATE POLICY "Mantra curators can manage their own articles"
  ON articles
  FOR ALL
  TO authenticated
  USING (
    author_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'mantra_curator'
    )
  )
  WITH CHECK (
    author_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'mantra_curator'
    )
  );

-- Ensure articles created by mantra curators have correct author_id
CREATE OR REPLACE FUNCTION set_article_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_id IS NULL THEN
    NEW.author_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set author_id
DROP TRIGGER IF EXISTS ensure_article_author_trigger ON articles;
CREATE TRIGGER ensure_article_author_trigger
  BEFORE INSERT ON articles
  FOR EACH ROW
  EXECUTE FUNCTION set_article_author();

-- Update the is_mantra_curator helper function
CREATE OR REPLACE FUNCTION is_mantra_curator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'mantra_curator'
  );
END;
$$;

-- Insert a test mantra_curator user for development
-- Uncomment and modify this if you need a test user
-- INSERT INTO admin_users (email, role) 
-- VALUES ('curator@example.com', 'mantra_curator')
-- ON CONFLICT (email) DO NOTHING;