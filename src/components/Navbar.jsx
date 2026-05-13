// src/components/Navbar.jsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Update this path to your real logo
import companyLogo from '../assets/logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Don't render navbar if user is not authenticated
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Adjust max-w / px to control distance from screen edges */}
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-8 py-3">
        {/* LEFT: logo + company name + subtitle */}
        <Link
          to={isAdmin ? '/admin' : '/employee'}
          className="flex items-center gap-3"
        >
          {/* Logo – change h-12 w-12 if you want different size */}
          <img
            src={companyLogo}
            alt="sskatt logo"
            className="h-12 w-12 object-contain"
          />

          <div className="flex flex-col leading-tight">
            {/* Company name: purple → pink gradient, slightly less bold */}
            <span
              className="text-2xl font-bold tracking-tight"
              style={{
                background:
                  'linear-gradient(90deg, #7c3aed 0%, #ec4899 100%)', // purple -> pink
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              ssKatt
            </span>
            <span className="mt-0.5 text-xs font-medium text-slate-500">
              Files Management Tracking
            </span>
          </div>
        </Link>

        {/* CENTER: empty space */}
        <div className="flex-1" />

        {/* RIGHT: username + role + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            {/* Username: a bit lighter now (font-semibold) */}
            <div className="max-w-[260px] truncate text-sm font-semibold text-slate-900">
              {user.name}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              <span className="capitalize">{user.role}</span>
              {user.department && ` • ${user.department}`}
            </div>
          </div>

          {/* User Avatar (visible on mobile) */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-sm md:hidden">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>

          {/* Logout button with lucide log-out SVG */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
            title="Logout"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* lucide log-out icon */}
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;