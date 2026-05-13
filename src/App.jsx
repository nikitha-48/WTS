// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

function App() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Only show Navbar when user is authenticated */}
      {user && <Navbar />}

      <main className={user ? 'mx-auto max-w-[1280px] px-8 py-6' : ''}>
        <Routes>
          {/* Public Routes - Redirect to dashboard if already logged in */}
          <Route
            path="/login"
            element={
              user ? (
                <Navigate
                  to={user.role === 'admin' ? '/admin' : '/employee'}
                  replace
                />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/employee" replace /> : <Signup />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={user.role === 'admin' ? '/admin' : '/employee'}
                  replace
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;