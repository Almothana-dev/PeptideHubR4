import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, isPasswordValid } from '../lib/auth';
import { PasswordValidation } from '../types/auth';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';

interface AuthFormProps {
  onSuccess: () => void;
  onSignInClick?: () => void;
  onSignUpClick?: () => void;
}

export const SignUpForm: React.FC<AuthFormProps> = ({ onSuccess, onSignInClick }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [validation, setValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasUpperCase: false,
    hasLowerCase: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setValidation(validatePassword(newPassword));
  };

  const validateUsername = (username: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(validation)) {
      setError('Please meet all password requirements');
      return;
    }

    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, username);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
            placeholder="Choose a username"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          3-20 characters, letters, numbers, and underscores only
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={handlePasswordChange}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
            placeholder="••••••••"
          />
        </div>
        
        <div className="mt-2 space-y-1 text-sm">
          <p className={validation.hasMinLength ? 'text-green-600' : 'text-gray-500'}>
            ✓ At least 8 characters
          </p>
          <p className={validation.hasNumber ? 'text-green-600' : 'text-gray-500'}>
            ✓ Contains a number
          </p>
          <p className={validation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}>
            ✓ Contains a special character
          </p>
          <p className={validation.hasUpperCase ? 'text-green-600' : 'text-gray-500'}>
            ✓ Contains an uppercase letter
          </p>
          <p className={validation.hasLowerCase ? 'text-green-600' : 'text-gray-500'}>
            ✓ Contains a lowercase letter
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0065A7] text-white px-4 py-2 rounded-lg hover:bg-[#005490] disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSignInClick}
          className="text-[#0065A7] hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

export const SignInForm: React.FC<AuthFormProps> = ({ onSuccess, onSignUpClick }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password, rememberMe);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="signin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="signin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-gray-300 text-[#0065A7] focus:ring-[#0065A7]"
          />
          <span className="ml-2 text-sm text-gray-600">Remember me</span>
        </label>

        <button
          type="button"
          onClick={() => {/* TODO: Show password reset form */}}
          className="text-sm text-[#0065A7] hover:underline"
        >
          Forgot password?
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0065A7] text-white px-4 py-2 rounded-lg hover:bg-[#005490] disabled:opacity-50 transition-colors"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSignUpClick}
          className="text-[#0065A7] hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
};
