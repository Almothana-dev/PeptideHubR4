/*
  # Fix stack statistics permissions

  1. Changes
    - Drop materialized view and replace with regular view
    - Add RLS policies for reviews table
    - Add function to calculate stack statistics

  2. Security
    - Enable RLS on reviews table
    - Add policies for authenticated users
*/

-- Drop the materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS stack_stats;

-- Create a regular view instead
CREATE OR REPLACE VIEW stack_stats AS
SELECT 
  s.id as stack_id,
  s.name,
  s.creator_id,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as average_rating,
  COUNT(r.id) as review_count
FROM stacks s
LEFT JOIN reviews r ON s.id = r.stack_id
GROUP BY s.id, s.name, s.creator_id;

-- Update reviews table RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

-- Create new policies
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

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to get stack statistics
CREATE OR REPLACE FUNCTION get_stack_stats(stack_uuid uuid)
RETURNS TABLE (
  average_rating numeric,
  review_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
    COUNT(*)::bigint as review_count
  FROM reviews
  WHERE stack_id = stack_uuid;
END;
$$;
