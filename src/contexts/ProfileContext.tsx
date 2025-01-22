import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  location?: string;
  professional_title?: string;
  avatar_url?: string;
  diet_type?: string;
  custom_diet?: string;
  morbidities?: string[];
}

interface Settings {
  email_notifications: boolean;
}

interface ProfileContextType {
  profile: Profile | null;
  settings: Settings | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  refreshProfile: () => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
      setSettings(null);
      setLoading(false);
    }
  }, [user]);

  const refreshProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      setProfile(profileData);
      setSettings(settingsData || { email_notifications: true });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    await refreshProfile();
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    await updateProfile({ avatar_url: publicUrl });
    return publicUrl;
  };

  const updateSettings = async (data: Partial<Settings>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        ...data,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    await refreshProfile();
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        settings,
        loading,
        error,
        updateProfile,
        uploadAvatar,
        refreshProfile,
        updateSettings,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
