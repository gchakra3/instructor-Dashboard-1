/*
  # Create articles table for learning content

  1. New Tables
    - `articles`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required) 
      - `preview_text` (text, required)
      - `image_url` (text, optional)
      - `video_url` (text, optional)
      - `category` (text, default 'general')
      - `tags` (text array, optional)
      - `status` (text, default 'draft')
      - `view_count` (integer, default 0)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `published_at` (timestamptz, optional)

  2. Security
    - Enable RLS on `articles` table
    - Add policy for anyone to read published articles
    - Add policy for authenticated users to manage articles (for admin)
*/

CREATE TABLE IF NOT EXISTS articles (
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

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to read published articles
CREATE POLICY "Anyone can read published articles"
  ON articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Policy for authenticated users to manage articles (admin functionality)
CREATE POLICY "Authenticated users can manage articles"
  ON articles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS articles_status_idx ON articles(status);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles(published_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();