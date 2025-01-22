/*
  # PeptideHub Initial Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - Links to auth.users
      - `username` (text, unique) - User's display name
      - `created_at` (timestamp) - When profile was created
      
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `emoji` (text) - Category emoji
      - `icon` (text) - Lucide icon name
      
    - `stacks`
      - `id` (uuid, primary key)
      - `name` (text) - Stack name
      - `creator_id` (uuid) - References profiles
      - `category_id` (uuid) - References categories
      - `dosage` (text) - Dosage instructions
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `stack_references`
      - `id` (uuid, primary key)
      - `stack_id` (uuid) - References stacks
      - `pmid` (text) - PubMed ID
      - `created_at` (timestamp)
      
    - `reviews`
      - `id` (uuid, primary key)
      - `stack_id` (uuid) - References stacks
      - `user_id` (uuid) - References profiles
      - `rating` (decimal) - 1-5 rating
      - `comment` (text) - Optional review text
      - `created_at` (timestamp)
      
    - `votes`
      - `id` (uuid, primary key)
      - `stack_id` (uuid) - References stacks
      - `user_id` (uuid) - References profiles
      - `is_upvote` (boolean) - true for upvote, false for downvote
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for:
      - Public read access to most tables
      - Authenticated user access for creating/updating content
      - Creator-only access for updating their own content
      
  3. Functions
    - Calculate average rating for stacks
    - Calculate total votes for stacks
*/

-- Create tables
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emoji text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  creator_id uuid REFERENCES profiles(id) NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  dosage text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE stack_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  pmid text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  rating decimal(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stack_id, user_id)
);

CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  is_upvote boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stack_id, user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policies

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE username = 'admin'
  ));

-- Stacks
CREATE POLICY "Stacks are viewable by everyone"
  ON stacks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create stacks"
  ON stacks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own stacks"
  ON stacks FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Stack References
CREATE POLICY "Stack references are viewable by everyone"
  ON stack_references FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Stack creators can manage references"
  ON stack_references FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT creator_id FROM stacks WHERE id = stack_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT creator_id FROM stacks WHERE id = stack_id
    )
  );

-- Reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Votes
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage own votes"
  ON votes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Functions

-- Calculate average rating for a stack
CREATE OR REPLACE FUNCTION get_stack_rating(stack_uuid uuid)
RETURNS TABLE (
  average_rating decimal,
  review_count bigint
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COALESCE(AVG(rating), 0)::numeric, 1) as average_rating,
    COUNT(*)::bigint as review_count
  FROM reviews
  WHERE stack_id = stack_uuid;
END;
$$;

-- Calculate total votes for a stack
CREATE OR REPLACE FUNCTION get_stack_votes(stack_uuid uuid)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  total_votes bigint;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN is_upvote THEN 1 ELSE -1 END), 0)
  INTO total_votes
  FROM votes
  WHERE stack_id = stack_uuid;
  
  RETURN total_votes;
END;
$$;

-- Insert initial categories
INSERT INTO categories (name, emoji, icon) VALUES
  ('Focus', '🎯', 'Target'),
  ('Cognition', '🧠', 'Brain'),
  ('Sleep', '😴', 'Moon'),
  ('Joint Health', '🦴', 'Bone'),
  ('Gut Health', '🔄', 'Repeat2'),
  ('Energy', '⚡', 'Zap');
