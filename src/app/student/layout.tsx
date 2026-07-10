'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LucideLogOut } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const getInitials = (name?: string, fallbackId?: string) => {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return fallbackId ? fallbackId.substring(0, 2).toUpperCase() : 'ST';
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isLessonView = pathname?.includes('/lesson/');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: metrics } = useQuery({
    queryKey: ['student', 'metrics'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/metrics');
      return res.data;
    },
  });

  const { data: classesData } = useQuery({
    queryKey: ['student', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/classes');
      return res.data?.classes || [];
    },
  });

  const classes = Array.isArray(classesData) ? classesData : [];
  const showNavigationChrome = !isLessonView;

  const level = Math.floor((metrics?.overall_progress || 0) / 20) + 1;
  const expProgress = ((metrics?.overall_progress || 0) % 20) * 5;

  return (
    <div className="app-shell-accent flex min-h-screen bg-transparent">
      {showNavigationChrome && (
        <aside className="w-[280px] bg-[var(--color-surface)] border-r border-[var(--color-outline-variant)] flex flex-col hidden md:flex">
          <div className="p-6 border-b border-[var(--color-outline-variant)]">
            <h1 className="text-xl font-bold tracking-tight"><span className="text-brand">Edu</span><span className="text-white">Flow</span></h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/student/dashboard" className={`block px-4 py-3 rounded-lg transition-colors border-l-2 font-medium ${pathname === '/student/dashboard' ? 'bg-brand/10 text-brand border-brand' : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-container-high)] hover:text-brand border-transparent hover:border-brand'}`}>
              Dashboard
            </Link>
          </nav>
          <div className="p-4 border-t border-[var(--color-outline-variant)] z-10 relative bg-[var(--color-surface)]">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-container-high)] transition-all text-sm font-medium mb-2">
              <LucideLogOut className="w-5 h-5" />
              Sign out
            </button>
            <div className="text-sm text-[var(--color-muted)] px-4 pb-8">
              Student Portal v1.0
            </div>
          </div>
        </aside>
      )}

      <main className={`flex-1 flex flex-col ${showNavigationChrome ? 'h-screen overflow-hidden' : 'min-h-screen overflow-hidden'}`}>
        {showNavigationChrome && (
          <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)] flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-[var(--color-text)]">Learning Workspace</h2>
            </div>
            <div className="flex items-center gap-4">
              {classes.length === 0 ? (
                <span className="text-sm font-semibold text-brand bg-brand/10 border border-brand/30 px-3 py-1.5 rounded-full">
                  Not enrolled in a class
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-muted)]">Level {level}</span>
                  <div className="w-32 h-2 bg-[var(--color-outline-variant)] rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${expProgress}%` }}></div>
                  </div>
                  <span className="text-xs text-[var(--color-muted)]">{expProgress}%</span>
                </div>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  {getInitials(user?.full_name || user?.username, 'S')}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl shadow-xl z-50 py-2">
                    <div className="px-4 py-2 border-b border-[var(--color-outline-variant)]">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">{user?.full_name || user?.username || 'Student'}</p>
                      <p className="text-xs text-[var(--color-muted)] truncate">{user?.email || 'Student account'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--color-surface-container-high)] flex items-center gap-2 transition-colors font-medium"
                    >
                      <LucideLogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <div className={`flex-1 overflow-auto ${showNavigationChrome ? 'p-4 md:p-[var(--spacing-margin-desktop)]' : ''}`}>
          <div className={`${showNavigationChrome ? 'max-w-[1280px] mx-auto' : 'h-full'}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
