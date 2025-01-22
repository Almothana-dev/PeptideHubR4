/*
  # Update stack stats to use whole number ratings

  1. Changes
    - Modify get_stack_stats function to round ratings to whole numbers
    - Update stack_stats view to use rounded ratings
*/

-- Update the get_stack_stats function to round to whole numbers
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

-- Update the stack_stats view to use rounded ratings
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
