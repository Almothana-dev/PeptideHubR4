/*
  # Update dosage frequencies structure

  1. Changes
    - Create frequency schedules table
    - Add new columns to dosage_frequencies table
    - Update existing data
    - Add new combinations

  2. Security
    - Enable RLS on new tables
    - Add policies for public viewing
*/

-- Create frequency schedules table
CREATE TABLE IF NOT EXISTS frequency_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to dosage_frequencies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dosage_frequencies' AND column_name = 'times_per_frequency'
  ) THEN
    ALTER TABLE dosage_frequencies ADD COLUMN times_per_frequency integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dosage_frequencies' AND column_name = 'schedule_id'
  ) THEN
    ALTER TABLE dosage_frequencies ADD COLUMN schedule_id uuid REFERENCES frequency_schedules(id);
  END IF;
END $$;

-- Enable RLS on new table
ALTER TABLE frequency_schedules ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Frequency schedules are viewable by everyone"
  ON frequency_schedules FOR SELECT
  TO public
  USING (true);

-- Insert frequency schedules
INSERT INTO frequency_schedules (name) VALUES
  ('daily'),
  ('weekly'),
  ('monthly')
ON CONFLICT DO NOTHING;

-- Update existing data with a default schedule (daily)
UPDATE dosage_frequencies df
SET 
  times_per_frequency = df.times_per_day,
  schedule_id = fs.id
FROM frequency_schedules fs
WHERE fs.name = 'daily'
  AND df.times_per_frequency IS NULL;

-- Insert additional frequencies
WITH schedules AS (
  SELECT id as schedule_id, name
  FROM frequency_schedules
),
new_frequencies AS (
  -- Daily frequencies (1-4 times)
  SELECT 
    f.times as times_per_frequency,
    s.schedule_id
  FROM (
    SELECT generate_series(1, 4) as times
  ) f
  CROSS JOIN schedules s
  WHERE s.name = 'daily'
  UNION ALL
  -- Weekly frequencies (1-2 times)
  SELECT 
    f.times as times_per_frequency,
    s.schedule_id
  FROM (
    SELECT generate_series(1, 2) as times
  ) f
  CROSS JOIN schedules s
  WHERE s.name = 'weekly'
  UNION ALL
  -- Monthly frequency (once)
  SELECT 
    1 as times_per_frequency,
    s.schedule_id
  FROM schedules s
  WHERE s.name = 'monthly'
)
INSERT INTO dosage_frequencies (times_per_frequency, schedule_id, times_per_day)
SELECT 
  times_per_frequency,
  schedule_id,
  CASE WHEN s.name = 'daily' THEN times_per_frequency ELSE 0 END
FROM new_frequencies nf
JOIN frequency_schedules s ON s.id = nf.schedule_id
WHERE NOT EXISTS (
  SELECT 1 
  FROM dosage_frequencies df 
  WHERE df.times_per_frequency = nf.times_per_frequency 
  AND df.schedule_id = nf.schedule_id
);

-- Create view for formatted frequency display
CREATE OR REPLACE VIEW formatted_frequencies AS
SELECT 
  df.id,
  df.times_per_frequency,
  fs.name as schedule,
  CASE
    WHEN df.times_per_frequency = 1 THEN 
      CASE fs.name
        WHEN 'daily' THEN 'Once daily'
        WHEN 'weekly' THEN 'Once weekly'
        WHEN 'monthly' THEN 'Once monthly'
      END
    ELSE 
      df.times_per_frequency || ' times ' || fs.name
  END as display_name
FROM dosage_frequencies df
JOIN frequency_schedules fs ON df.schedule_id = fs.id
ORDER BY 
  CASE fs.name
    WHEN 'daily' THEN 1
    WHEN 'weekly' THEN 2
    WHEN 'monthly' THEN 3
  END,
  df.times_per_frequency;

-- Add unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_frequency_combination'
  ) THEN
    ALTER TABLE dosage_frequencies
    ADD CONSTRAINT unique_frequency_combination 
    UNIQUE (times_per_frequency, schedule_id);
  END IF;
END $$;
