/*
  # Add structured dosage information
  
  1. New Tables
    - `dosage_units`
      - `id` (uuid, primary key)
      - `name` (text, e.g., 'milligram', 'microgram')
      - `symbol` (text, e.g., 'mg', 'µg')
    
    - `dosage_frequencies`
      - `id` (uuid, primary key)
      - `name` (text, e.g., 'twice per day', 'once daily')
      - `times_per_day` (integer)

  2. Changes
    - Add structured dosage columns to `stacks` table
    - Keep existing dosage column for backward compatibility
    
  3. Security
    - Enable RLS on new tables
    - Add policies for reading dosage reference data
*/

-- Create dosage units table
CREATE TABLE dosage_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  symbol text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create dosage frequencies table
CREATE TABLE dosage_frequencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  times_per_day integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to stacks table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'dosage_amount'
  ) THEN
    ALTER TABLE stacks 
      ADD COLUMN dosage_amount decimal(10,2),
      ADD COLUMN dosage_unit_id uuid REFERENCES dosage_units(id),
      ADD COLUMN dosage_frequency_id uuid REFERENCES dosage_frequencies(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE dosage_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosage_frequencies ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Dosage units are viewable by everyone"
  ON dosage_units FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Dosage frequencies are viewable by everyone"
  ON dosage_frequencies FOR SELECT
  TO public
  USING (true);

-- Insert initial data
INSERT INTO dosage_units (name, symbol) VALUES
  ('milligram', 'mg'),
  ('microgram', 'µg'),
  ('gram', 'g'),
  ('milliliter', 'ml'),
  ('nanogram', 'ng');

INSERT INTO dosage_frequencies (name, times_per_day) VALUES
  ('once daily', 1),
  ('twice daily', 2),
  ('three times daily', 3),
  ('four times daily', 4),
  ('every other day', 0.5),
  ('weekly', 0.14);
