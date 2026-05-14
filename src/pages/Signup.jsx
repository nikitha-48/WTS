// src/pages/Signup.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false); // shows success/pending banner

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!formData.email.endsWith('@sskatt.com')) {
      setError('Only company emails (@sskatt.com) are allowed.');
      setLoading(false);
      return;
    }

    const result = signup({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      department: formData.department,
    });

    setLoading(false);

    if (result.success && result.pendingApproval) {
      setSubmitted(true); // show pending-approval screen
    } else if (!result.success) {
      setError(result.error);
    }
  };

  const departments = [
    'HR','Python Developer', 'Research', 'Cybersecurity', 'Devops',
    'Testing', 'Data Analyst',
  ];

  // ── Pending-approval success screen ────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 p-4">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 shadow-lg ring-8 ring-amber-50">
              <ClockIcon className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">Account Submitted!</h1>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            Your registration is complete. An admin will review and approve your
            account shortly. You'll be able to log in once approved.
          </p>

          {/* Info box */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-3">
              What happens next?
            </p>
            <ul className="space-y-2">
              {[
                'Admin receives your registration request',
                'Admin reviews and approves your account',
                'You can then log in with your email & password',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-700">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* User details recap */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Registered as
            </p>
            <p className="text-sm font-semibold text-slate-800">{formData.name}</p>
            <p className="text-xs text-slate-500">{formData.email}</p>
            {formData.department && (
              <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600">
                {formData.department}
              </span>
            )}
          </div>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-sky-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg">
              <UserCircleIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Join as an employee · Admin approval required
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">

        

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-rose-500" />
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCircleIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="yourname@sskatt.com"
                  pattern=".+@sskatt\.com"
                  title="Please use your company email address ending in @sskatt.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                  required
                />
              </div>
             
            </div>

            {/* Department */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Department{' '}
                <span className="font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <BuildingOfficeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Passwords match
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-sm font-bold text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Request Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;