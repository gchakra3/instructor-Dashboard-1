/*
  # Create article_views table for tracking article views

  1. New Tables
    - `article_views`
      - `id` (uuid, primary key)
      - `article_id` (uuid, foreign key to articles)
      - `fingerprint` (text, user fingerprint)
      - `viewed_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `article_views` table
    - Add policy for anyone to insert views
    - Add policy for authenticated users to read views (for analytics)
*/

CREATE TABLE IF NOT EXISTS article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to insert views
CREATE POLICY "Anyone can insert article views"
  ON article_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy for authenticated users to read views (for analytics)
CREATE POLICY "Authenticated users can read article views"
  ON article_views
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS article_views_article_id_idx ON article_views(article_id);
CREATE INDEX IF NOT EXISTS article_views_fingerprint_idx ON article_views(fingerprint);
CREATE INDEX IF NOT EXISTS article_views_viewed_at_idx ON article_views(viewed_at);

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

-- Create trigger to automatically update view count when a view is added
CREATE TRIGGER update_article_view_count_trigger
  AFTER INSERT ON article_views
  FOR EACH ROW
  EXECUTE FUNCTION update_article_view_count();