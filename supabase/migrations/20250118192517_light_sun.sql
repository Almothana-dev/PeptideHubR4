/*
  # Fix Profile Settings and Categories

  1. Changes
    - Create profile_settings table if it doesn't exist
    - Add audit_logs table for tracking account deactivations
    - Update RLS policies for profile_settings

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for profile_settings
*/

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Create profile_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  language text DEFAULT 'en',
  is_public boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  stack_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profile settings policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own settings" ON profile_settings;
  DROP POLICY IF EXISTS "Users can update own settings" ON profile_settings;
  DROP POLICY IF EXISTS "Users can insert own settings" ON profile_settings;
END $$;

CREATE POLICY "Users can view own settings"
  ON profile_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON profile_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON profile_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default settings for existing profiles
INSERT INTO profile_settings (user_id, theme, language, is_public, email_notifications, stack_notifications)
SELECT 
  p.id,
  'light',
  'en',
  true,
  true,
  true
FROM profiles p
LEFT JOIN profile_settings ps ON p.id = ps.user_id
WHERE ps.id IS NULL;
