'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  LayoutDashboard,
  Loader2,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="auth-grid" />

      <div className="max-w-md w-full relative">
        <div className="text-center mb-8 space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-brand uppercase tracking-widest hover:bg-white/10 transition-colors mb-4">
            <LayoutDashboard size={14} /> EduFlow Platform
          </Link>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Reset your <span className="text-brand">password</span>
          </h1>
          <p className="text-muted font-medium text-sm">
            Enter your email address to receive a password reset link.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Reset link sent</h3>
              <p className="text-sm text-muted">
                We sent password reset instructions to <strong>{email}</strong>. Please check your inbox.
              </p>
              <Link href="/login" className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-colors mt-6">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Your email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    placeholder="hello@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-brand hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-6"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Send request <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="text-center pt-2">
              <p className="text-sm text-slate-500 font-medium">
                Remembered your password?{' '}
                <Link href="/login" className="text-brand font-bold hover:opacity-80 transition-colors">Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
