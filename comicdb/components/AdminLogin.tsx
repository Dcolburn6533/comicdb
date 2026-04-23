'use client';

import { FormEvent, useState } from 'react';

interface AdminLoginProps {
  onLogin: (username: string) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      onLogin(data.username);
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="absolute inset-0 bg-halftone-light opacity-40 pointer-events-none" />

      <div
        className="relative w-full max-w-md border-4 border-black bg-white"
        style={{ boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)' }}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-slate-900 px-8 py-6 border-b-4 border-black">
          <div className="absolute inset-0 bg-halftone-dark" />
          <div className="relative z-10 text-center">
            <h1
              className="text-4xl text-white tracking-wide"
              style={{ fontFamily: 'var(--font-comic-display)' }}
            >
              Admin Access
            </h1>
            <p className="mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
              Authorized Personnel Only
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <div className="mb-5 border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-black uppercase tracking-widest text-gray-600 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border-2 border-black px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-black uppercase tracking-widest text-gray-600 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-black px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border-3 border-black bg-red-700 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-800 disabled:opacity-50 transition-colors cursor-pointer"
              style={{ boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)' }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
