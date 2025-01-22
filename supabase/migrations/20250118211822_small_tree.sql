/*
  # Fix stack name uniqueness constraint

  1. Changes
    - Drop existing unique constraint on stack names if it exists
    - Add new composite unique constraint for name + creator_id
    
  2. Security
    - Maintains existing RLS policies
*/

-- Drop existing unique constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE stacks
    DROP CONSTRAINT IF EXISTS unique_stack_name;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Add new composite unique constraint
DO $$ 
BEGIN
  ALTER TABLE stacks
    ADD CONSTRAINT unique_stack_name_per_user 
    UNIQUE (name, creator_id);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_stack_name_per_user ON stacks IS 
  'Ensures stack names are unique per user but allows different users to use the same name';
