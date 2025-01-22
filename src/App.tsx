import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProtocolsPage } from './pages/ProtocolsPage';
import { LoginPage } from './pages/LoginPage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { CreateProtocolPage } from './pages/CreateProtocolPage';
import { EditProtocolPage } from './pages/EditProtocolPage';
import { ProtocolDetailsPage } from './pages/ProtocolDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProfileProvider } from './contexts/ProfileContext';

export default function App() {
  const { user } = useAuth();

  return (
    <ProfileProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="protocols">
            <Route index element={<ProtocolsPage />} />
            <Route path=":id" element={<ProtocolDetailsPage />} />
            <Route
              path="create"
              element={
                <ProtectedRoute>
                  <CreateProtocolPage />
                </ProtectedRoute>
              }
            />
            <Route
              path=":id/edit"
              element={
                <ProtectedRoute>
                  <EditProtocolPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="login"
            element={user ? <Navigate to="/protocols" replace /> : <LoginPage />}
          />
        </Route>
      </Routes>
    </ProfileProvider>
  );
}
