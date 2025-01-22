/*
  # Database Optimizations and Security Enhancements
  
  1. Indexes
    - Add indexes for foreign keys and frequently queried columns
  2. Constraints
    - Add check constraints for numerical values
  3. Performance
    - Add materialized view for stack statistics
  4. Security
    - Add missing RLS policies
*/

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stack_references_pmid ON stack_references(pmid);
CREATE INDEX IF NOT EXISTS idx_reviews_stack_user ON reviews(stack_id, user_id);
CREATE INDEX IF NOT EXISTS idx_votes_stack_user ON votes(stack_id, user_id);
CREATE INDEX IF NOT EXISTS idx_stacks_category ON stacks(category_id);

-- Add check constraints
ALTER TABLE reviews 
  ADD CONSTRAINT chk_rating_precision 
  CHECK (rating = ROUND(rating, 1));

ALTER TABLE stacks 
  ADD CONSTRAINT chk_dosage_positive 
  CHECK (dosage_amount > 0);

-- Create materialized view for stack statistics
CREATE MATERIALIZED VIEW stack_stats AS
SELECT 
  s.id as stack_id,
  s.name,
  s.creator_id,
  COALESCE(r.avg_rating, 0) as average_rating,
  COALESCE(r.review_count, 0) as review_count,
  COALESCE(v.vote_count, 0) as vote_count
FROM stacks s
LEFT JOIN (
  SELECT 
    stack_id, 
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) as review_count
  FROM reviews
  GROUP BY stack_id
) r ON s.id = r.stack_id
LEFT JOIN (
  SELECT 
    stack_id,
    SUM(CASE WHEN is_upvote THEN 1 ELSE -1 END) as vote_count
  FROM votes
  GROUP BY stack_id
) v ON s.id = v.stack_id;

CREATE UNIQUE INDEX idx_stack_stats_id ON stack_stats(stack_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_stack_stats()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stack_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh materialized view
CREATE TRIGGER refresh_stack_stats_on_review
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_stack_stats();

CREATE TRIGGER refresh_stack_stats_on_vote
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_stack_stats();

-- Add missing RLS policies
CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add table and column comments
COMMENT ON TABLE stacks IS 'Supplement and protocol stacks created by users';
COMMENT ON TABLE stack_references IS 'Scientific references supporting stack efficacy';
COMMENT ON TABLE reviews IS 'User reviews and ratings for stacks';
COMMENT ON TABLE votes IS 'User votes (upvotes/downvotes) for stacks';
COMMENT ON TABLE dosage_units IS 'Reference table for medication dosage units';
COMMENT ON TABLE dosage_frequencies IS 'Reference table for medication frequency';

-- Add column comments
COMMENT ON COLUMN stacks.dosage_amount IS 'Numerical value of the dosage';
COMMENT ON COLUMN stacks.dosage_unit_id IS 'Reference to the unit of measurement for the dosage';
COMMENT ON COLUMN stacks.dosage_frequency_id IS 'Reference to how often the stack should be taken';
