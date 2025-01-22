/*
  # Update Reviews System

  1. Changes
    - Add check constraint for valid rating values
    - Add index for faster rating calculations
    - Update get_stack_stats function to handle decimal ratings
    - Add trigger for real-time rating updates

  2. Security
    - Maintain existing RLS policies
    - Add validation for rating values
*/

-- Add check constraint for valid ratings (1.0 to 5.0, one decimal place)
ALTER TABLE reviews
ADD CONSTRAINT chk_valid_rating
CHECK (
  rating >= 1.0 
  AND rating <= 5.0
  AND rating = ROUND(rating, 1)
);

-- Add index for faster rating calculations
CREATE INDEX IF NOT EXISTS idx_reviews_rating
ON reviews(stack_id, rating);

-- Update get_stack_stats function to handle decimal ratings
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
    ROUND(COALESCE(AVG(rating), 0)::numeric, 1) as average_rating,
    COUNT(*)::bigint as review_count
  FROM reviews
  WHERE stack_id = stack_uuid;
END;
$$;

-- Create a function to validate ratings
CREATE OR REPLACE FUNCTION validate_rating()
RETURNS trigger AS $$
BEGIN
  -- Ensure rating is between 1.0 and 5.0
  IF NEW.rating < 1.0 OR NEW.rating > 5.0 THEN
    RAISE EXCEPTION 'Rating must be between 1.0 and 5.0';
  END IF;

  -- Round to one decimal place
  NEW.rating = ROUND(NEW.rating::numeric, 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating validation
CREATE TRIGGER validate_rating_trigger
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION validate_rating();

-- Add comment explaining rating system
COMMENT ON COLUMN reviews.rating IS 'Rating value between 1.0 and 5.0 with one decimal place precision';
