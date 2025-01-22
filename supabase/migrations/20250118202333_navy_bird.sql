-- Create administration methods table
CREATE TABLE IF NOT EXISTS administration_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add column to stack_supplements
ALTER TABLE stack_supplements
ADD COLUMN IF NOT EXISTS administration_method_id uuid REFERENCES administration_methods(id);

-- Enable RLS
ALTER TABLE administration_methods ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Administration methods are viewable by everyone"
  ON administration_methods FOR SELECT
  TO public
  USING (true);

-- Insert initial data
INSERT INTO administration_methods (name) VALUES
  ('Oral'),
  ('Sublingual'),
  ('Topical'),
  ('Subcutaneous'),
  ('Intramuscular'),
  ('Nasal'),
  ('Transdermal'),
  ('Inhalation')
ON CONFLICT (name) DO NOTHING;
