import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    // Backend should ignore or restrict this; admins can set roles separately.
    role: 'employee'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.endsWith('@sskatt.com')) {
      setError('Only company emails (@sskatt.com) are allowed.');
      return;
    }

    try {
      setLoading(true);
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'employee'
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          'Registration failed. Please check your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-md rounded-lg bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-xl font-semibold text-gray-800">Sign up</h1>
      <p className="mb-6 text-sm text-gray-600">
        Create your employee account to securely upload your files.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="yourname@sskatt.com"
            pattern=".+@sskatt\.com"
            title="Please use your company email address ending in @sskatt.com"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Register with your company email address, for example <strong>chandu@sskatt.com</strong>.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-blue-600">
          Login
        </Link>
      </p>
    </div>
  );
};

export default Register;