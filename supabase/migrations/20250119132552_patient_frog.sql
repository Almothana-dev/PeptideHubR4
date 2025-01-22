/*
  # Add Saved Protocols Feature

  1. New Tables
    - `saved_protocols`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `stack_id` (uuid, references stacks)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create saved protocols table
CREATE TABLE saved_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stack_id)
);

-- Enable RLS
ALTER TABLE saved_protocols ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own saved protocols"
  ON saved_protocols FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save/unsave protocols"
  ON saved_protocols FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_saved_protocols_user ON saved_protocols(user_id);
CREATE INDEX idx_saved_protocols_stack ON saved_protocols(stack_id);

-- Add comments
COMMENT ON TABLE saved_protocols IS 'Tracks protocols saved by users';
COMMENT ON COLUMN saved_protocols.user_id IS 'The user who saved the protocol';
COMMENT ON COLUMN saved_protocols.stack_id IS 'The saved protocol';
