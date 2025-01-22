/*
  # Fix Stack Supplements Table Structure

  1. Changes
    - Add missing columns for dosage units and schedules
    - Update existing columns to match the application requirements
    - Add proper constraints and indexes

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing stack_supplements table if it exists
DROP TABLE IF EXISTS stack_supplements CASCADE;

-- Recreate stack_supplements table with correct structure
CREATE TABLE stack_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  dosage_amount decimal(10,2) NOT NULL,
  dosage_unit_id uuid REFERENCES dosage_units(id) NOT NULL,
  frequency_amount integer NOT NULL,
  frequency_schedule_id uuid REFERENCES frequency_schedules(id) NOT NULL,
  administration_method_id uuid REFERENCES administration_methods(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT chk_dosage_amount_positive CHECK (dosage_amount > 0),
  CONSTRAINT chk_frequency_amount_positive CHECK (frequency_amount > 0)
);

-- Enable RLS
ALTER TABLE stack_supplements ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Stack supplements are viewable by everyone"
  ON stack_supplements FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND is_public = true
      AND is_deleted = false
    )
  );

CREATE POLICY "Stack owners can manage supplements"
  ON stack_supplements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND creator_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX idx_stack_supplements_stack_id ON stack_supplements(stack_id);
CREATE INDEX idx_stack_supplements_dosage_unit ON stack_supplements(dosage_unit_id);
CREATE INDEX idx_stack_supplements_frequency ON stack_supplements(frequency_schedule_id);
CREATE INDEX idx_stack_supplements_administration ON stack_supplements(administration_method_id);

-- Add trigger for updated_at
CREATE TRIGGER update_stack_supplements_updated_at
  BEFORE UPDATE ON stack_supplements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE stack_supplements IS 'Supplements associated with each stack/protocol';
COMMENT ON COLUMN stack_supplements.name IS 'Name of the supplement';
COMMENT ON COLUMN stack_supplements.description IS 'Optional description of the supplement';
COMMENT ON COLUMN stack_supplements.dosage_amount IS 'Numerical value of the dosage';
COMMENT ON COLUMN stack_supplements.dosage_unit_id IS 'Reference to the unit of measurement for the dosage';
COMMENT ON COLUMN stack_supplements.frequency_amount IS 'Number of times to take the supplement';
COMMENT ON COLUMN stack_supplements.frequency_schedule_id IS 'Schedule for taking the supplement (daily, weekly, etc)';
COMMENT ON COLUMN stack_supplements.administration_method_id IS 'Method of administering the supplement';
COMMENT ON COLUMN stack_supplements.notes IS 'Optional additional notes about the supplement';
