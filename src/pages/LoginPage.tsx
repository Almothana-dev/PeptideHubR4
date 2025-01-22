import React, { useState } from 'react';
import { SignInForm, SignUpForm } from '../components/AuthForms';
import { useNavigate } from 'react-router-dom';
import { Database } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/protocols');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-gradient-to-r from-[#0065A7] to-[#005490] text-white p-2 rounded-lg shadow-sm">
              <Database className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 text-transparent bg-clip-text mb-2">
            {isSignUp ? 'Create an Account' : 'Welcome To PeptideHub'}
          </h1>
          <p className="text-gray-600">
            {isSignUp
              ? 'Join our community of health enthusiasts'
              : 'Sign in to access protocols and share your experience'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 backdrop-blur-sm">
          {isSignUp ? (
            <SignUpForm
              onSuccess={handleAuthSuccess}
              onSignInClick={() => setIsSignUp(false)}
            />
          ) : (
            <SignInForm
              onSuccess={handleAuthSuccess}
              onSignUpClick={() => setIsSignUp(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
