/*
  # Add Comments System

  1. New Tables
    - `comments` - Stores protocol comments
      - `id` (uuid, primary key)
      - `stack_id` (uuid, references stacks)
      - `user_id` (uuid, references profiles)
      - `parent_id` (uuid, self-reference for replies)
      - `content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_edited` (boolean)
    - `comment_votes` - Stores up/down votes on comments
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments)
      - `user_id` (uuid, references profiles)
      - `is_upvote` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for viewing and managing comments
    - Add policies for managing votes
*/

-- Create comments table
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false,
  CONSTRAINT valid_parent_check CHECK (parent_id != id) -- Prevent self-referencing
);

-- Create comment votes table
CREATE TABLE comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_upvote boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment votes policies
CREATE POLICY "Comment votes are viewable by everyone"
  ON comment_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage own votes"
  ON comment_votes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_comments_stack ON comments(stack_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user ON comment_votes(user_id);

-- Function to get comment stats
CREATE OR REPLACE FUNCTION get_comment_stats(comment_uuid uuid)
RETURNS TABLE (
  upvotes bigint,
  downvotes bigint,
  reply_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE is_upvote = true)::bigint as upvotes,
    COUNT(*) FILTER (WHERE is_upvote = false)::bigint as downvotes,
    (SELECT COUNT(*)::bigint FROM comments WHERE parent_id = comment_uuid) as reply_count
  FROM comment_votes
  WHERE comment_id = comment_uuid;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE comments IS 'User comments on protocols';
COMMENT ON TABLE comment_votes IS 'Up/down votes on comments';
COMMENT ON COLUMN comments.content IS 'Comment text, limited to 2000 characters';
COMMENT ON COLUMN comments.parent_id IS 'ID of parent comment for replies';
COMMENT ON COLUMN comments.is_edited IS 'Indicates if comment has been edited';
