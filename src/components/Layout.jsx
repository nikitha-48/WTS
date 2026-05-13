// src/components/Layout.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left - Logo & Role */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-sm">
                {isAdmin ? (
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                ) : (
                  <UserCircleIcon className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  File Management System
                </h1>
                <p className="text-xs text-slate-500">
                  {isAdmin ? 'Admin Dashboard' : 'Employee Portal'}
                </p>
              </div>
            </div>

            {/* Right - User info & logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {user?.email}
                  {user?.department && ` • ${user.department}`}
                </p>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;