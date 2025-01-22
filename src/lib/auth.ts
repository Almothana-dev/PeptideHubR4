import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export const validatePassword = (password: string) => {
  return {
    hasMinLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password)
  };
};

export const isPasswordValid = (validation: ReturnType<typeof validatePassword>) => {
  return Object.values(validation).every(Boolean);
};

// Rate limiting for password reset attempts
const resetAttempts = new Map<string, { count: number; timestamp: number }>();

export const checkResetRateLimit = (email: string): boolean => {
  const now = Date.now();
  const attempt = resetAttempts.get(email);

  if (!attempt) {
    resetAttempts.set(email, { count: 1, timestamp: now });
    return true;
  }

  // Reset count if more than 24 hours have passed
  if (now - attempt.timestamp > 24 * 60 * 60 * 1000) {
    resetAttempts.set(email, { count: 1, timestamp: now });
    return true;
  }

  // Allow maximum 3 attempts per 24 hours
  if (attempt.count >= 3) {
    return false;
  }

  attempt.count += 1;
  resetAttempts.set(email, attempt);
  return true;
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, attempt] of resetAttempts.entries()) {
    if (now - attempt.timestamp > 24 * 60 * 60 * 1000) {
      resetAttempts.delete(email);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour
