/*
  # Update rating calculation

  1. Changes
    - Modify get_stack_stats function to calculate true average from all reviews
    - Update stack_stats view to match the same calculation
    - Add index on reviews table for better performance
*/

-- Update the get_stack_stats function
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
    COALESCE(ROUND(AVG(rating)), 0) as average_rating,
    COUNT(*)::bigint as review_count
  FROM reviews
  WHERE stack_id = stack_uuid;
END;
$$;

-- Update the stack_stats view
CREATE OR REPLACE VIEW stack_stats AS
SELECT 
  s.id as stack_id,
  s.name,
  s.creator_id,
  COALESCE(ROUND(AVG(r.rating)), 0) as average_rating,
  COUNT(r.id) as review_count
FROM stacks s
LEFT JOIN reviews r ON s.id = r.stack_id
GROUP BY s.id, s.name, s.creator_id;

-- Add index for better performance on rating queries
CREATE INDEX IF NOT EXISTS idx_reviews_stack_rating ON reviews(stack_id, rating);

-- Add comment explaining the rating calculation
COMMENT ON FUNCTION get_stack_stats IS 'Calculates the average rating from all reviews for a stack, rounded to whole numbers';
COMMENT ON VIEW stack_stats IS 'Provides stack statistics including average rating (rounded to whole numbers) from all reviews';
