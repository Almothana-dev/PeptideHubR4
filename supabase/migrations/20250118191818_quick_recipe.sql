/*
  # User Profile and Stack Management Features

  1. New Tables
    - `profile_settings`
      - User preferences and settings
      - Theme, language, privacy controls
    - `stack_versions`
      - Version history for stacks
    - `stack_shares`
      - Sharing and visibility settings
    - `stack_categories`
      - Categories/tags for stacks
    
  2. Changes
    - Add new columns to `profiles` table
    - Add soft delete to `stacks` table
    
  3. Security
    - RLS policies for new tables
    - Updated policies for modified tables
*/

-- Extend profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create profile_settings table
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

-- Add version tracking to stacks
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;

-- Create stack_versions table
CREATE TABLE IF NOT EXISTS stack_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  version integer NOT NULL,
  name text NOT NULL,
  description text,
  dosage text NOT NULL,
  dosage_amount decimal(10,2),
  dosage_unit_id uuid REFERENCES dosage_units(id),
  dosage_frequency_id uuid REFERENCES dosage_frequencies(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

-- Create stack_categories table
CREATE TABLE IF NOT EXISTS stack_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stack_id, category_id)
);

-- Create stack_shares table
CREATE TABLE IF NOT EXISTS stack_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid REFERENCES stacks(id) ON DELETE CASCADE NOT NULL,
  share_type text NOT NULL CHECK (share_type IN ('link', 'embed')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

-- Enable RLS
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profile Settings
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

-- Stack Versions
CREATE POLICY "Anyone can view versions of public stacks"
  ON stack_versions FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND is_public = true
      AND is_deleted = false
    )
  );

CREATE POLICY "Stack owners can manage versions"
  ON stack_versions FOR ALL
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

-- Stack Categories
CREATE POLICY "Anyone can view categories of public stacks"
  ON stack_categories FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND is_public = true
      AND is_deleted = false
    )
  );

CREATE POLICY "Stack owners can manage categories"
  ON stack_categories FOR ALL
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

-- Stack Shares
CREATE POLICY "Anyone can view active share links"
  ON stack_shares FOR SELECT
  TO public
  USING (
    (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM stacks
      WHERE id = stack_id
      AND is_deleted = false
    )
  );

CREATE POLICY "Stack owners can manage shares"
  ON stack_shares FOR ALL
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

-- Functions

-- Function to soft delete a stack
CREATE OR REPLACE FUNCTION soft_delete_stack(stack_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stacks
  SET 
    is_deleted = true,
    deleted_at = now()
  WHERE id = stack_uuid
  AND creator_id = auth.uid();
END;
$$;

-- Function to restore a soft-deleted stack
CREATE OR REPLACE FUNCTION restore_stack(stack_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stacks
  SET 
    is_deleted = false,
    deleted_at = null
  WHERE id = stack_uuid
  AND creator_id = auth.uid()
  AND deleted_at > now() - interval '30 days';
END;
$$;

-- Function to generate a unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_profile_settings_updated_at
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Insert default settings for existing users
INSERT INTO profile_settings (user_id)
SELECT id FROM profiles
ON CONFLICT DO NOTHING;
