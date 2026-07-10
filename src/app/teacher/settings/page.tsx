'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  User,
  Phone,
  Lock,
  Save,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

export default function TeacherSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '0901234567',
    currentPassword: '',
    newPassword: '',
  });

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    }
  });

  useEffect(() => {
    if (user?.full_name) {
      setFormData(prev => ({ ...prev, fullName: user.full_name }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const payload: any = { fullName: formData.fullName };
      if (formData.newPassword) {
        payload.newPassword = formData.newPassword;
      }
      await apiClient.patch('/auth/profile', payload);
      setSuccess(true);
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Update settings failed:', err);
      setError(err.response?.data?.message || 'Unable to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/teacher/dashboard" className="p-2 bg-[var(--color-surface)] rounded-full border border-[var(--color-outline-variant)] text-[var(--color-muted)] hover:text-brand hover:border-brand/30 transition-colors shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Account settings</h1>
            <p className="text-[var(--color-muted)] text-sm">Manage your personal details and security preferences.</p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-outline-variant)] shadow-sm overflow-hidden">
          {success && (
            <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center justify-center gap-2 text-emerald-700 font-medium">
              <CheckCircle2 size={20} /> Profile updated successfully.
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-center gap-2 text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Personal Info Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-[var(--color-text)] border-b border-[var(--color-outline-variant)] pb-2">Personal information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Full name</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] group-focus-within:text-brand transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl py-3 pl-11 pr-4 text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      placeholder="Enter full name..."
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Phone number</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] group-focus-within:text-brand transition-colors">
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl py-3 pl-11 pr-4 text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      placeholder="Enter phone number..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-6 pt-4">
              <h2 className="text-lg font-bold text-[var(--color-text)] border-b border-[var(--color-outline-variant)] pb-2">Change password</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Current password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] group-focus-within:text-brand transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                      className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl py-3 pl-11 pr-4 text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">New password</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] group-focus-within:text-brand transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl py-3 pl-11 pr-4 text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      placeholder="Enter new password..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-brand hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-brand/20 flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save changes
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
