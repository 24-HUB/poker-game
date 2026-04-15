import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useLogin } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { mutate: login, isPending, error } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(
      { email, password },
      { onSuccess: () => navigate('/lobby') }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-4xl font-bold text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
            ♠ POKER GACHA
          </h1>
          <p className="text-white/50 mt-2 text-sm">Texas Hold'em + Anime Cosmetics</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="font-cinzel text-xl text-white mb-6 text-center">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-[#e74c3c]/20 border border-[#e74c3c]/40 rounded-lg text-red-300 text-sm">
              {error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#ffd700]/60 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#ffd700]/60 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" size="lg" loading={isPending} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-center text-white/40 text-sm mt-5">
            No account?{' '}
            <Link to="/register" className="text-[#ffd700] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
