/*
  # Fix Profile Settings Tables

  1. Changes
    - Add is_active column to profiles
    - Add indexes for faster lookups
    - Add missing constraints
    - Add automatic cleanup for old avatars

  2. Security
    - Add RLS policies for profile management
    - Add secure function for account deactivation
*/

-- Add is_active column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profile_settings_user_id ON profile_settings(user_id);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profile_settings_user_id_fkey'
  ) THEN
    ALTER TABLE profile_settings
    ADD CONSTRAINT profile_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Function to clean up old avatars
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS trigger AS $$
BEGIN
  -- If avatar_url is being updated and there was an old one
  IF (TG_OP = 'UPDATE') AND 
     (OLD.avatar_url IS NOT NULL) AND 
     (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) THEN
    -- Delete old avatar file (implementation depends on storage setup)
    -- This is a placeholder for the actual implementation
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for avatar cleanup
DROP TRIGGER IF EXISTS cleanup_old_avatars_trigger ON profiles;
CREATE TRIGGER cleanup_old_avatars_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_avatars();

-- Ensure default settings exist for all profiles
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

-- Update RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can view own settings" ON profile_settings;
  DROP POLICY IF EXISTS "Users can update own settings" ON profile_settings;
END $$;

-- Create new policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Users can view own settings"
  ON profile_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON profile_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function for secure account deactivation
CREATE OR REPLACE FUNCTION deactivate_account(user_uuid uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to deactivate their own account
  IF auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    is_active = false,
    updated_at = now()
  WHERE id = user_uuid;

  -- Log deactivation reason if provided
  IF reason IS NOT NULL THEN
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (user_uuid, 'account_deactivation', reason);
  END IF;
END;
$$;
