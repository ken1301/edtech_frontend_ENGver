'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import {
  LucideBook,
  LucideChevronRight,
  LucideClock,
  LucideTrophy,
  LucideArrowLeft,
  LucideSearch,
  LucideFilter
} from 'lucide-react';

export default function StudentClassesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'none' | 'name'>('none');

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['student', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/student/classes');
      return res.data;
    }
  });

  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || [];

  let filteredClasses = classes.filter((cls: any) => 
    cls.class_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sortBy === 'name') {
    filteredClasses = [...filteredClasses].sort((a, b) => a.class_name.localeCompare(b.class_name));
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/student/dashboard" className="p-2 bg-[var(--color-surface)] rounded-full border border-[var(--color-outline-variant)] text-[var(--color-muted)] hover:text-brand hover:border-brand/30 transition-colors shadow-sm">
          <LucideArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[var(--color-text)] tracking-tight">All classes</h1>
          <p className="text-sm font-medium text-[var(--color-muted)] mt-1">A list of classes you are currently enrolled in</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)] group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl py-3 pl-12 pr-4 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={() => setSortBy(prev => prev === 'none' ? 'name' : 'none')}
          className={`flex items-center gap-2 px-6 py-3 border rounded-2xl transition-all font-medium shadow-sm ${
            sortBy === 'name' 
              ? 'bg-brand/10 border-brand/40 text-brand hover:bg-brand/15' 
              : 'bg-[var(--color-surface)] border-[var(--color-outline-variant)] text-[var(--color-muted)] hover:bg-[var(--color-surface-container-high)]'
          }`}
        >
          <LucideFilter size={18} />
          {sortBy === 'name' ? 'Filtered: Name A-Z' : 'Filter results'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-outline-variant)] h-64"></div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[32px] shadow-sm">
          <LucideBook className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">You have not joined any classes yet</h3>
          <p className="text-[var(--color-muted)]">Ask your teacher for a class code to get started.</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[32px] shadow-sm">
          <LucideSearch className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">No classes found</h3>
          <p className="text-[var(--color-muted)]">No classes match the search query "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls: any, index: number) => {
            const colors = [
              { bg: 'bg-brand', lightBg: 'bg-brand/10', text: 'text-brand', border: 'border-brand/30' },
              { bg: 'bg-accent', lightBg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30' },
              { bg: 'bg-emerald-500', lightBg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' }
            ];
            const theme = colors[index % colors.length];

            return (
              <div key={cls.class_id} className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[24px] overflow-hidden hover:shadow-xl hover:shadow-black/20 transition-all group flex flex-col">
                <div className={`${theme.lightBg} ${theme.border} border-b p-6 relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-surface)] opacity-20 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className={`w-12 h-12 ${theme.bg} rounded-2xl flex items-center justify-center text-white font-bold shadow-sm`}>
                      {cls.class_name.substring(0, 1)}
                    </div>
                    <span className={`px-3 py-1 bg-[var(--color-surface)] rounded-full text-xs font-bold ${theme.text} shadow-sm border ${theme.border}`}>
                      {cls.status || 'Active'}
                    </span>
                  </div>
                  <h3 className={`mt-4 text-xl font-bold ${theme.text} tracking-tight`}>{cls.class_name}</h3>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4 mb-6">
                    <p className="text-[var(--color-muted)] text-sm line-clamp-2">
                      {cls.description || 'No description has been added for this class yet.'}
                    </p>
                    <div className="flex items-center gap-4 text-sm font-medium text-[var(--color-muted)]">
                      <div className="flex items-center gap-1.5 bg-[var(--color-surface-container-high)] px-3 py-1.5 rounded-lg">
                        <LucideClock className="w-4 h-4 text-[var(--color-muted)]" /> {cls.lesson_count || 12} lessons
                      </div>
                      <div className="flex items-center gap-1.5 bg-[var(--color-surface-container-high)] px-3 py-1.5 rounded-lg">
                        <LucideTrophy className="w-4 h-4 text-yellow-500" /> {cls.rank ? `Rank ${cls.rank}` : 'Rank 3'}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/student/roadmap?class=${cls.class_id}`}
                    className={`w-full py-3 px-4 ${theme.bg} text-white font-bold rounded-xl flex items-center justify-between group-hover:brightness-110 transition-all active:scale-[0.98] shadow-sm`}
                  >
                    Enter class <LucideChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
