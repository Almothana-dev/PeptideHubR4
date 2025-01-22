/*
  # Set up avatar storage and permissions

  1. Storage Setup
    - Create avatars bucket for storing profile pictures
    - Set up public access for avatar files
  
  2. Security
    - Enable RLS for storage
    - Add policies for avatar uploads and downloads
*/

-- Enable storage by creating the avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Avatar files are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'avatars' AND
    CASE
      WHEN RIGHT(name, 4) = '.jpg' THEN true
      WHEN RIGHT(name, 4) = '.png' THEN true
      ELSE false
    END
  );

CREATE POLICY "Users can update own avatar files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete own avatar files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2]);
