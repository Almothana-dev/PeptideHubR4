/*
  # Fix Supplements Structure and Edit Tracking

  1. Changes
    - Add missing columns for supplements
    - Add edit tracking for supplements
    - Update existing columns to match the application requirements

  2. Security
    - Maintain existing RLS policies
*/

-- Add edit tracking columns to stacks if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE stacks
    ADD COLUMN last_edited_at timestamptz,
    ADD COLUMN edit_count integer DEFAULT 0;
  END IF;
END $$;

-- Create or replace function to update edit tracking
CREATE OR REPLACE FUNCTION update_stack_edit_tracking()
RETURNS trigger AS $$
BEGIN
  NEW.last_edited_at = now();
  NEW.edit_count = COALESCE(OLD.edit_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for edit tracking if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'track_stack_edits'
  ) THEN
    CREATE TRIGGER track_stack_edits
      BEFORE UPDATE ON stacks
      FOR EACH ROW
      EXECUTE FUNCTION update_stack_edit_tracking();
  END IF;
END $$;

-- Create supplements edit history table
CREATE TABLE IF NOT EXISTS stack_supplements_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id uuid NOT NULL,
  stack_id uuid NOT NULL,
  edited_by uuid REFERENCES profiles(id) NOT NULL,
  edited_at timestamptz DEFAULT now() NOT NULL,
  changes jsonb NOT NULL
);

-- Enable RLS on supplements history
ALTER TABLE stack_supplements_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for supplements history
CREATE POLICY "Stack owners can view supplements history"
  ON stack_supplements_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own supplements edits"
  ON stack_supplements_history FOR INSERT
  TO authenticated
  WITH CHECK (edited_by = auth.uid());

-- Function to record supplements edit history
CREATE OR REPLACE FUNCTION record_supplement_edit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO stack_supplements_history (
    supplement_id,
    stack_id,
    edited_by,
    changes
  ) VALUES (
    NEW.id,
    NEW.stack_id,
    auth.uid(),
    jsonb_build_object(
      'previous', to_jsonb(OLD),
      'current', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recording supplements edit history
CREATE TRIGGER record_supplement_edit_history
  AFTER UPDATE ON stack_supplements
  FOR EACH ROW
  EXECUTE FUNCTION record_supplement_edit();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplements_history_supplement_id 
  ON stack_supplements_history(supplement_id);
CREATE INDEX IF NOT EXISTS idx_supplements_history_stack_id 
  ON stack_supplements_history(stack_id);
CREATE INDEX IF NOT EXISTS idx_supplements_history_edited_by 
  ON stack_supplements_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_supplements_history_edited_at 
  ON stack_supplements_history(edited_at);

-- Add comments
COMMENT ON TABLE stack_supplements_history IS 'History of changes made to supplements';
COMMENT ON COLUMN stack_supplements_history.supplement_id IS 'ID of the modified supplement';
COMMENT ON COLUMN stack_supplements_history.stack_id IS 'ID of the stack containing the supplement';
COMMENT ON COLUMN stack_supplements_history.edited_by IS 'User who made the changes';
COMMENT ON COLUMN stack_supplements_history.edited_at IS 'When the changes were made';
COMMENT ON COLUMN stack_supplements_history.changes IS 'JSON containing previous and current state';
