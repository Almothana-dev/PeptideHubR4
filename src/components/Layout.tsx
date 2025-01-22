import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Database, Plus, User, LogOut, LogIn } from 'lucide-react';

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left Side - Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <div className="bg-gradient-to-r from-[#0065A7] to-[#005490] text-white p-1.5 rounded-lg shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[#0065A7] text-xl font-bold">PeptideHub</span>
            </Link>

            {/* Center - Navigation */}
            <nav className="flex items-center gap-1">
              <Link
                to="/protocols"
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-[#0065A7]/5 hover:text-[#0065A7] font-medium transition-colors"
              >
                Protocols
              </Link>
              {user && (
                <Link
                  to="/profile"
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-[#0065A7]/5 hover:text-[#0065A7] font-medium transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              )}
            </nav>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to="/protocols/create"
                    className="bg-gradient-to-r from-[#0065A7] to-[#005490] text-white px-4 py-2 rounded-lg hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Protocol</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-lg text-gray-600 hover:bg-[#0065A7]/5 hover:text-[#0065A7] transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#0065A7] text-[#0065A7] hover:bg-[#0065A7] hover:text-white font-medium transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-600">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-gradient-to-r from-[#0065A7] to-[#005490] text-white p-1.5 rounded-lg shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[#0065A7] text-xl font-bold">PeptideHub</span>
            </div>
            <p className="text-sm">Made with 💉 🌍</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
