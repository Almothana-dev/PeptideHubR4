/*
  # Add Protocol References Support

  1. New Tables
    - `protocol_references`
      - `id` (uuid, primary key)
      - `stack_id` (uuid, references stacks)
      - `reference_type` (text, e.g., 'pubmed', 'doi')
      - `reference_id` (text, the actual reference identifier)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `protocol_references` table
    - Add policies for public viewing and owner management
*/

-- Create protocol references table
CREATE TABLE protocol_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('pubmed', 'doi')),
  reference_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stack_id, reference_type, reference_id)
);

-- Enable RLS
ALTER TABLE protocol_references ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Protocol references are viewable by everyone"
  ON protocol_references FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND is_public = true
      AND is_deleted = false
    )
  );

CREATE POLICY "Stack owners can manage references"
  ON protocol_references FOR ALL
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
CREATE INDEX idx_protocol_references_stack ON protocol_references(stack_id);
CREATE INDEX idx_protocol_references_type_id ON protocol_references(reference_type, reference_id);

-- Add comments
COMMENT ON TABLE protocol_references IS 'Scientific references supporting protocol efficacy';
COMMENT ON COLUMN protocol_references.reference_type IS 'Type of reference (pubmed, doi)';
COMMENT ON COLUMN protocol_references.reference_id IS 'Identifier for the reference';
