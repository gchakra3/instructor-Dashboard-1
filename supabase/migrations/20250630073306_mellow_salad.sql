/*
  # Create ratings table for article ratings

  1. New Tables
    - `ratings`
      - `id` (uuid, primary key)
      - `article_id` (uuid, foreign key to articles)
      - `rating` (integer, 1-5 scale)
      - `fingerprint` (text, user fingerprint)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `ratings` table
    - Add policy for anyone to insert/update ratings
    - Add policy for anyone to read ratings
    - Add unique constraint to prevent duplicate ratings per user per article
*/

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(article_id, fingerprint)
);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to insert/update their own ratings
CREATE POLICY "Anyone can manage their own ratings"
  ON ratings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for anyone to read all ratings
CREATE POLICY "Anyone can read ratings"
  ON ratings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS ratings_article_id_idx ON ratings(article_id);
CREATE INDEX IF NOT EXISTS ratings_fingerprint_idx ON ratings(fingerprint);
CREATE INDEX IF NOT EXISTS ratings_rating_idx ON ratings(rating);