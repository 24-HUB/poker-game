import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useRegister } from '../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { mutate: register, isPending, error } = useRegister();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(
      { username, email, password },
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
          <h2 className="font-cinzel text-xl text-white mb-6 text-center">Create Account</h2>

          {error && (
            <div className="mb-4 p-3 bg-[#e74c3c]/20 border border-[#e74c3c]/40 rounded-lg text-red-300 text-sm">
              {error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">Username</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#ffd700]/60 transition-colors"
                placeholder="CoolPlayer99"
              />
            </div>
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
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#ffd700]/60 transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <Button type="submit" size="lg" loading={isPending} className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <p className="text-center text-white/40 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#ffd700] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          You start with <span className="text-[#ffd700]">1,000 chips</span> — enough for 6 gacha pulls
        </p>
      </div>
    </div>
  );
}
