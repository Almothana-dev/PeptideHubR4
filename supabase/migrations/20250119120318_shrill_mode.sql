/*
  # Fix stack statistics triggers

  1. Changes
    - Remove old triggers that referenced materialized view
    - Add new trigger for review statistics updates
    - Add function to notify of statistics changes

  2. Security
    - Function runs with security definer to ensure proper access
*/

-- Drop old refresh function and triggers if they exist
DROP TRIGGER IF EXISTS refresh_stack_stats_on_review ON reviews;
DROP TRIGGER IF EXISTS refresh_stack_stats_on_vote ON votes;
DROP FUNCTION IF EXISTS refresh_stack_stats();

-- Create new notify function for statistics updates
CREATE OR REPLACE FUNCTION notify_stack_stats_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify the application that stats have changed for this stack
  PERFORM pg_notify(
    'stack_stats_change',
    json_build_object(
      'stack_id', COALESCE(NEW.stack_id, OLD.stack_id),
      'operation', TG_OP
    )::text
  );
  RETURN NULL;
END;
$$;

-- Create new trigger for reviews
CREATE TRIGGER notify_stack_stats_change_on_review
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_stack_stats_change();
