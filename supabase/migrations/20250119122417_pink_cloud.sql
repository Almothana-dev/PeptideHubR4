-- Add edit tracking columns to stacks table
ALTER TABLE stacks
ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

-- Create function to update edit tracking
CREATE OR REPLACE FUNCTION update_stack_edit_tracking()
RETURNS trigger AS $$
BEGIN
  NEW.last_edited_at = now();
  NEW.edit_count = COALESCE(OLD.edit_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for edit tracking
CREATE TRIGGER track_stack_edits
  BEFORE UPDATE ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION update_stack_edit_tracking();

-- Add edit history table
CREATE TABLE IF NOT EXISTS stack_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  edited_by uuid REFERENCES profiles(id) NOT NULL,
  edited_at timestamptz DEFAULT now() NOT NULL,
  changes jsonb NOT NULL
);

-- Enable RLS on edit history
ALTER TABLE stack_edit_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for edit history
CREATE POLICY "Stack owners can view edit history"
  ON stack_edit_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own edits"
  ON stack_edit_history FOR INSERT
  TO authenticated
  WITH CHECK (edited_by = auth.uid());

-- Function to record edit history
CREATE OR REPLACE FUNCTION record_stack_edit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO stack_edit_history (
    stack_id,
    edited_by,
    changes
  ) VALUES (
    NEW.id,
    auth.uid(),
    jsonb_build_object(
      'previous', to_jsonb(OLD),
      'current', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recording edit history
CREATE TRIGGER record_stack_edit_history
  AFTER UPDATE ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION record_stack_edit();
