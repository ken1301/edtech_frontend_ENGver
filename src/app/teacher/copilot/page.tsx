'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Brain, ArrowLeft, CheckCircle, Warning, Clock,
  ArrowRight, SealWarning, Sparkle, BookOpen
} from '@phosphor-icons/react';
import apiClient from '@/lib/apiClient';

interface CopilotReportItem {
  lessonId: string;
  title: string;
  subject?: string;
  topic?: string;
  classNames?: string;
  status: 'PENDING' | 'ANALYSING' | 'REPORT_READY' | 'FAILED';
  reportedAt?: string;
  acknowledgedAt?: string;
  publishedAt?: string;
}

function StatusBadge({ status }: { status: CopilotReportItem['status'] }) {
  const map = {
    REPORT_READY: { label: 'Report ready', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <CheckCircle size={12} weight="fill" /> },
    ANALYSING:    { label: 'Analyzing', cls: 'border-blue-200 bg-blue-50 text-blue-700', icon: <motion.div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> },
    FAILED:       { label: 'Failed', cls: 'border-rose-200 bg-rose-50 text-rose-700', icon: <SealWarning size={12} weight="fill" /> },
    PENDING:      { label: 'Pending', cls: 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-muted)]', icon: <Clock size={12} /> },
  };
  const { label, cls, icon } = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

function ReportCard({ item, index }: { item: CopilotReportItem; index: number }) {
  const isReady = item.status === 'REPORT_READY';
  const isUnread = isReady && !item.acknowledgedAt;

  const formattedDate = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
    >
      <Link
        href={`/teacher/copilot/${item.lessonId}`}
        className={`group flex items-center gap-5 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
          isUnread
            ? 'border-[var(--color-primary)]/25 bg-[var(--color-primary)]/4 hover:border-[var(--color-primary)]/40'
            : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30'
        }`}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${
          isReady
            ? 'bg-gradient-to-br from-[var(--color-primary)]/15 to-indigo-500/10'
            : 'bg-[var(--color-surface-container-high)]'
        }`}>
          <Brain size={22} weight="duotone" className={isReady ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-[var(--color-text)] truncate">{item.title}</span>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
            )}
          </div>
          {item.classNames && (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-2.5 py-1 font-semibold text-[var(--color-primary)]">
                Class: {item.classNames}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={item.status} />
            {(item.subject || item.topic) && (
              <span className="text-xs text-[var(--color-muted)]">
                {[item.subject, item.topic].filter(Boolean).join(' · ')}
              </span>
            )}
            {formattedDate && (
              <span className="text-xs text-[var(--color-muted)]">Published {formattedDate}</span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight size={16} className="text-[var(--color-muted)] flex-shrink-0 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all" />
      </Link>
    </motion.div>
  );
}

export default function CopilotReportsListPage() {
  const { data, isLoading } = useQuery<CopilotReportItem[]>({
    queryKey: ['teacher', 'copilot', 'reports'],
    queryFn: async () => {
      const res = await apiClient.get('/teacher/copilot/reports');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const reports = data || [];
  const readyCount = reports.filter(r => r.status === 'REPORT_READY').length;
  const unreadCount = reports.filter(r => r.status === 'REPORT_READY' && !r.acknowledgedAt).length;

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl py-10 px-6 pb-20">

        {/* Back */}
        <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline mb-6 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Brain size={22} weight="duotone" className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Teacher Copilot</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--color-primary)] text-white text-xs font-bold px-2.5 py-0.5">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-muted)] ml-13">
            A full list of AI analysis reports for published lessons
          </p>
        </div>

        {/* Stats */}
        {reports.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-text)]">{reports.length}</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">Total lessons taught</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{readyCount}</p>
              <p className="text-xs text-emerald-500 mt-0.5">With reports</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-primary)]">{unreadCount}</p>
              <p className="text-xs text-[var(--color-primary)]/70 mt-0.5">Unread</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-[var(--color-outline-variant)]" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && reports.length === 0 && (
          <div className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-16 text-center">
            <Sparkle size={48} weight="duotone" className="mx-auto mb-5 text-[var(--color-muted)]" />
            <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">No reports yet</h3>
            <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto mb-8 leading-relaxed">
              Copilot will automatically analyze results after students complete a lesson and generate a detailed report for you.
            </p>
            <Link
              href="/teacher/lesson/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <BookOpen size={16} weight="duotone" /> Create a new lesson
            </Link>
          </div>
        )}

        {/* Report list */}
        {!isLoading && reports.length > 0 && (
          <div className="space-y-3">
            {/* Unread section */}
            {unreadCount > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] mb-2">
                  New reports · {unreadCount}
                </p>
                {reports
                  .filter(r => r.status === 'REPORT_READY' && !r.acknowledgedAt)
                  .map((item, i) => <ReportCard key={item.lessonId} item={item} index={i} />)
                }
                <div className="border-t border-[var(--color-outline-variant)] my-4" />
              </>
            )}

            {/* All / rest */}
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
              All lessons · {reports.length}
            </p>
            {reports.map((item, i) => <ReportCard key={item.lessonId} item={item} index={i} />)}
          </div>
        )}

      </div>
    </div>
  );
}
