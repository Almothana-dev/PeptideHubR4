/*
  # Add frequency schedules and supplements tables

  1. New Tables
    - `frequency_schedules`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)
    
    - `administration_methods`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamptz)
    
    - `stack_supplements`
      - `id` (uuid, primary key)
      - `stack_id` (uuid, references stacks)
      - `name` (text)
      - `description` (text)
      - `dosage_amount` (decimal)
      - `frequency_amount` (integer)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public viewing and authenticated management
*/

-- Create frequency schedules table
CREATE TABLE IF NOT EXISTS frequency_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for frequency schedules
ALTER TABLE frequency_schedules ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for frequency schedules
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Frequency schedules are viewable by everyone" ON frequency_schedules;
  
  CREATE POLICY "Frequency schedules are viewable by everyone"
    ON frequency_schedules FOR SELECT
    TO public
    USING (true);
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Insert initial frequency schedules
INSERT INTO frequency_schedules (name) VALUES
  ('daily'),
  ('weekly'),
  ('monthly'),
  ('twice daily'),
  ('three times daily'),
  ('four times daily'),
  ('every other day')
ON CONFLICT (name) DO NOTHING;

-- Create administration methods table
CREATE TABLE IF NOT EXISTS administration_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for administration methods
ALTER TABLE administration_methods ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for administration methods
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Administration methods are viewable by everyone" ON administration_methods;
  
  CREATE POLICY "Administration methods are viewable by everyone"
    ON administration_methods FOR SELECT
    TO public
    USING (true);
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Insert initial administration methods
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

-- Drop existing stack_supplements table if it exists
DROP TABLE IF EXISTS stack_supplements;

-- Create stack supplements table
CREATE TABLE stack_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  dosage_amount decimal(10,2) NOT NULL,
  frequency_amount integer NOT NULL,
  frequency_schedule_id uuid REFERENCES frequency_schedules(id),
  administration_method_id uuid REFERENCES administration_methods(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for stack supplements
ALTER TABLE stack_supplements ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for stack supplements
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Stack supplements are viewable by everyone" ON stack_supplements;
  DROP POLICY IF EXISTS "Stack owners can manage supplements" ON stack_supplements;

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
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stack_supplements_stack_id ON stack_supplements(stack_id);
CREATE INDEX IF NOT EXISTS idx_stack_supplements_frequency ON stack_supplements(frequency_schedule_id);
CREATE INDEX IF NOT EXISTS idx_stack_supplements_administration ON stack_supplements(administration_method_id);

-- Add comments
COMMENT ON TABLE stack_supplements IS 'Supplements associated with each stack/protocol';
COMMENT ON COLUMN stack_supplements.name IS 'Name of the supplement';
COMMENT ON COLUMN stack_supplements.description IS 'Optional description of the supplement';
COMMENT ON COLUMN stack_supplements.dosage_amount IS 'Numerical value of the dosage';
COMMENT ON COLUMN stack_supplements.frequency_amount IS 'Number of times to take the supplement';
COMMENT ON COLUMN stack_supplements.frequency_schedule_id IS 'Schedule for taking the supplement (daily, weekly, etc)';
COMMENT ON COLUMN stack_supplements.administration_method_id IS 'Method of administering the supplement';
COMMENT ON COLUMN stack_supplements.notes IS 'Optional additional notes about the supplement';
