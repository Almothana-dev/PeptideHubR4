/*
  # Update frequency schema

  1. Changes
    - Create new tables for frequency amounts and schedules
    - Add new columns to dosage_frequencies
    - Add constraints and relationships
    - Migrate existing data

  2. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS formatted_frequencies;

-- Create frequency amounts table
CREATE TABLE IF NOT EXISTS frequency_amounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(amount)
);

-- Create frequency schedules table
CREATE TABLE IF NOT EXISTS frequency_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

-- Add new columns to dosage_frequencies
ALTER TABLE dosage_frequencies 
ADD COLUMN IF NOT EXISTS amount_id uuid REFERENCES frequency_amounts(id),
ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES frequency_schedules(id);

-- Enable RLS
ALTER TABLE frequency_amounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequency_schedules ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$ 
BEGIN
  CREATE POLICY "Frequency amounts are viewable by everyone"
    ON frequency_amounts FOR SELECT
    TO public
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Frequency schedules are viewable by everyone"
    ON frequency_schedules FOR SELECT
    TO public
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Insert initial data
INSERT INTO frequency_amounts (amount)
VALUES (1), (2), (3), (4)
ON CONFLICT (amount) DO NOTHING;

INSERT INTO frequency_schedules (name)
VALUES ('daily'), ('weekly'), ('monthly')
ON CONFLICT (name) DO NOTHING;

-- Update existing data
WITH amount_mapping AS (
  SELECT df.times_per_day as old_amount, fa.id as amount_id
  FROM dosage_frequencies df
  JOIN frequency_amounts fa ON fa.amount = df.times_per_day
  WHERE df.times_per_day IS NOT NULL
),
schedule_mapping AS (
  SELECT fs.id as schedule_id
  FROM frequency_schedules fs
  WHERE fs.name = 'daily'
  LIMIT 1
)
UPDATE dosage_frequencies df
SET 
  amount_id = am.amount_id,
  schedule_id = sm.schedule_id
FROM amount_mapping am, schedule_mapping sm
WHERE df.times_per_day = am.old_amount;

-- Create new view for formatted display
CREATE VIEW formatted_frequencies AS
SELECT 
  df.id,
  fa.amount,
  fs.name as schedule,
  CASE
    WHEN fa.amount = 1 THEN 
      CASE fs.name
        WHEN 'daily' THEN 'Once daily'
        WHEN 'weekly' THEN 'Once weekly'
        WHEN 'monthly' THEN 'Once monthly'
      END
    ELSE 
      fa.amount || ' times ' || fs.name
  END as display_name
FROM dosage_frequencies df
JOIN frequency_amounts fa ON fa.id = df.amount_id
JOIN frequency_schedules fs ON fs.id = df.schedule_id
WHERE df.amount_id IS NOT NULL 
  AND df.schedule_id IS NOT NULL
ORDER BY 
  CASE fs.name
    WHEN 'daily' THEN 1
    WHEN 'weekly' THEN 2
    WHEN 'monthly' THEN 3
  END,
  fa.amount;

-- Add unique constraint for valid combinations
ALTER TABLE dosage_frequencies
DROP CONSTRAINT IF EXISTS unique_frequency_combination;

ALTER TABLE dosage_frequencies
ADD CONSTRAINT unique_frequency_combination 
UNIQUE (amount_id, schedule_id);

-- Create function to validate frequency combinations
CREATE OR REPLACE FUNCTION validate_frequency_combination()
RETURNS trigger AS $$
BEGIN
  -- Get amount and schedule values
  DECLARE
    amount_val integer;
    schedule_name text;
  BEGIN
    SELECT amount INTO amount_val
    FROM frequency_amounts
    WHERE id = NEW.amount_id;

    SELECT name INTO schedule_name
    FROM frequency_schedules
    WHERE id = NEW.schedule_id;

    -- Validate based on schedule
    IF schedule_name = 'daily' AND amount_val > 4 THEN
      RAISE EXCEPTION 'Daily frequency cannot exceed 4 times per day';
    ELSIF schedule_name = 'weekly' AND amount_val > 2 THEN
      RAISE EXCEPTION 'Weekly frequency cannot exceed 2 times per week';
    ELSIF schedule_name = 'monthly' AND amount_val > 1 THEN
      RAISE EXCEPTION 'Monthly frequency must be once per month';
    END IF;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for frequency validation
DROP TRIGGER IF EXISTS validate_frequency_trigger ON dosage_frequencies;

CREATE TRIGGER validate_frequency_trigger
  BEFORE INSERT OR UPDATE ON dosage_frequencies
  FOR EACH ROW
  EXECUTE FUNCTION validate_frequency_combination();
