import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  professional_title: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  is_public: boolean;
  email_notifications: boolean;
  stack_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  display_name: string;
  bio: string;
  location: string;
  professional_title: string;
  avatar_url?: string;
}

export interface SettingsFormData {
  theme: 'light' | 'dark';
  language: string;
  is_public: boolean;
  email_notifications: boolean;
  stack_notifications: boolean;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface EmailChangeData {
  new_email: string;
  password: string;
}

export interface DeactivateAccountData {
  password: string;
  reason?: string;
}

export interface ProfileFormData {
  display_name: string;
  bio: string;
  location: string;
  professional_title: string;
  diet_type: string;
  custom_diet?: string;
  morbidities: string[];
}
