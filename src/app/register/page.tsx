'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import {
  Lock,
  User,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  Loader2,
  Mail,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role] = useState<'STUDENT' | 'TEACHER'>('STUDENT');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/register', {
        username,
        email,
        password,
        full_name: fullName,
        role,
        invite_code: inviteCode,
      });

      router.push('/login?registered=true');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Registration failed. Please review your details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="auth-grid" />

      <div className="max-w-md w-full relative">
        <div className="text-center mb-8 space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-brand uppercase tracking-widest hover:bg-white/10 transition-colors mb-4">
            <LayoutDashboard size={14} /> <span className="text-brand">Edu</span><span className="text-white">Flow Platform</span>
          </Link>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Create your <span className="text-brand">account</span>
          </h1>
          <p className="text-muted font-medium text-sm">
            Start your learning journey with the English demo workspace.
          </p>
        </div>

        <div className="auth-card p-8 rounded-[32px] space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-shake">
              <ShieldCheck size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Full name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
                  <UserCircle size={18} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/6 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  placeholder="Enter your full name..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/6 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/6 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  placeholder="Choose a username..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/6 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Invite code</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
                  <ShieldCheck size={18} />
                </div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-white/6 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  placeholder="Enter your activation code..."
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-[0_18px_45px_rgba(255,115,92,0.28)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Complete registration <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-brand font-bold hover:opacity-80 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
