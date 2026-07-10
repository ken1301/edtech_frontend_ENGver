'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  ArrowLeft, BookOpen, PlusCircle, XCircle,
  Warning, CheckCircle, Brain, Target, Users, ArrowRight,
  SealWarning, Sparkle, ChartBar, Student, ArrowsClockwise,
  Clock
} from '@phosphor-icons/react';
import apiClient from '@/lib/apiClient';

interface CopilotReportData {
  lessonId: string;
  title: string;
  status: 'PENDING' | 'ANALYSING' | 'REPORT_READY' | 'FAILED';
  totalStudents?: number;
  report: {
    summary?: string;
    reasoning?: string;
    subject?: string;
    topic?: string;
    concept?: string;
    next_lesson_outcome?: {
      concept?: string;
      lesson_goal?: string;
      summary?: string;
    };
    students_needing_attention?: Array<{
      student_id: string;
      username?: string;
      reason: string;
      next_step: string;
    }>;
    [key: string]: unknown;
  } | null;
  reportedAt?: string;
  acknowledgedAt?: string;
  classNames?: string;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function ReportSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl py-10 px-6 animate-pulse space-y-6">
      <div className="h-4 w-32 bg-[var(--color-outline-variant)] rounded mb-8" />
      <div className="h-32 rounded-3xl bg-[var(--color-outline-variant)]" />
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--color-outline-variant)]" />)}
      </div>
      <div className="h-48 rounded-3xl bg-[var(--color-outline-variant)]" />
      <div className="h-36 rounded-3xl bg-[var(--color-outline-variant)]" />
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────
function NotFoundCard({ backUrl = '/teacher/dashboard' }: { backUrl?: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl py-20 px-6 text-center">
      <div className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-16">
        <SealWarning size={52} weight="duotone" className="mx-auto mb-6 text-[var(--color-muted)]" />
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">Report not found</h2>
        <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto mb-8 leading-relaxed">
          This report does not exist or you do not have permission to access it. Please return to the dashboard.
        </p>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}

// ─── Waiting State Card ──────────────────────────────────────────────────────
function StatusWaitingCard({ status, onRetry, retrying }: {
  status: 'PENDING' | 'ANALYSING' | 'FAILED';
  onRetry: () => void;
  retrying: boolean;
}) {
  const isPending = status === 'PENDING';
  const isAnalysing = status === 'ANALYSING';
  const isFailed = status === 'FAILED';

  return (
    <div className={`rounded-3xl border p-16 text-center ${
      isFailed
        ? 'border-rose-200/60 bg-rose-50/50'
        : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)]'
    }`}>
      {isFailed ? (
        <SealWarning size={52} weight="duotone" className="mx-auto mb-6 text-rose-400" />
      ) : (
        <div className="relative mx-auto mb-8 w-20 h-20 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10"
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-3 rounded-full bg-[var(--color-primary)]/15"
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.5 }}
          />
          <Brain size={38} weight="duotone" className="text-[var(--color-primary)] relative z-10" />
        </div>
      )}
      <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">
        {isPending && 'Waiting for analysis'}
        {isAnalysing && 'AI is analyzing the class...'}
        {isFailed && 'Unable to generate report'}
      </h3>
      <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto mb-10 leading-relaxed">
        {isPending && 'Copilot will analyze automatically once all students submit, or you can request it now.'}
        {isAnalysing && 'AI is evaluating the learning results of the full class. This page will refresh automatically when ready.'}
        {isFailed && 'An error occurred during analysis. Please try again.'}
      </p>

      {(isPending || isFailed) && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 shadow-lg ${
            isFailed
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
              : 'bg-[var(--color-primary)] hover:opacity-90 shadow-[var(--color-primary)]/25'
          }`}
        >
          {retrying
            ? <><motion.div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />Processing...</>
            : <><ArrowsClockwise size={18} weight="bold" />{isFailed ? 'Retry' : 'Analyze now'}</>
          }
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CopilotReportPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lessonId = params.lessonId as string;

  const [backUrl, setBackUrl] = React.useState('/teacher/dashboard');
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const classId = searchParams.get('classId');
      if (classId) {
        setBackUrl(`/teacher/dashboard?classId=${classId}&tab=learning-paths`);
      }
    }
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacher', 'copilot', lessonId, 'report'],
    queryFn: async () => {
      const res = await apiClient.get(`/teacher/copilot/${lessonId}/report`);
      return res.data as CopilotReportData;
    },
    retry: false,
    refetchInterval: (query) => {
      const s = query.state.data as CopilotReportData | undefined;
      if (s?.status === 'PENDING' || s?.status === 'ANALYSING') return 5000;
      return false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => apiClient.post(`/teacher/copilot/${lessonId}/analyse`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher', 'copilot', lessonId, 'report'] }),
  });

  const dismissMutation = useMutation({
    mutationFn: async () => apiClient.post(`/teacher/copilot/${lessonId}/dismiss`),
    onSuccess: () => router.push(backUrl),
  });

  const continueCurriculum = () => {
    const report = data?.report;
    const search = new URLSearchParams();
    if (report?.subject) search.set('subject', report.subject as string);
    if (report?.topic) search.set('topic', report.topic as string);
    const concept = report?.next_lesson_outcome?.concept || report?.concept;
    if (concept) search.set('concept', concept as string);
    if (report?.next_lesson_outcome?.lesson_goal) search.set('lessonGoal', report.next_lesson_outcome.lesson_goal);
    router.push(`/teacher/lesson/create?${search.toString()}`);
  };

  if (isLoading) return <div className="h-[100dvh] w-full overflow-y-auto"><ReportSkeleton /></div>;
  if (isError || !data) return <div className="h-[100dvh] w-full overflow-y-auto"><NotFoundCard backUrl={backUrl} /></div>;

  const status = data.status || 'PENDING';
  const report = data.report;
  const attentionItems = report?.students_needing_attention ?? [];
  const nextOutcome = report?.next_lesson_outcome;
  const totalStudents = data.totalStudents ?? 0;
  const goodStudents = Math.max(0, totalStudents - attentionItems.length);

  const stagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  const reportedAt = data.reportedAt
    ? new Date(data.reportedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-5xl py-10 px-6 pb-24">

        {/* ── Back nav ── */}
        <Link href={backUrl} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline mb-6 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to learning path
        </Link>

        {/* ── Hero Header ── */}
        <div className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[var(--color-primary)]/8 via-transparent to-transparent p-7 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Brain size={24} weight="duotone" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-1">Copilot AI Report</p>
                <h1 className="text-2xl font-black text-[var(--color-text)] leading-tight tracking-tight mb-2">
                  {data.title || lessonId}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-muted)]">
                  {data.classNames && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                      <span className="font-medium text-[var(--color-on-surface-variant)]">Class:</span>
                      <span className="font-semibold text-[var(--color-text)] bg-[var(--color-surface-container-high)] px-2 py-0.5 rounded-md">
                        {data.classNames}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="font-medium">Lesson:</span>
                    <span className="font-semibold text-[var(--color-text)]">{data.title || lessonId}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {reportedAt && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <Clock size={12} />
                  {reportedAt}
                </div>
              )}
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                status === 'REPORT_READY' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : status === 'FAILED' ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-muted)]'
              }`}>
                {status === 'ANALYSING' && <motion.div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />}
                {status === 'REPORT_READY' && <CheckCircle size={14} weight="fill" />}
                {status === 'FAILED' && <Warning size={14} weight="fill" />}
                {status === 'PENDING' && 'Pending'}
                {status === 'ANALYSING' && 'Analyzing'}
                {status === 'REPORT_READY' && 'Report ready'}
                {status === 'FAILED' && 'Failed'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Non-ready state ── */}
        {(status === 'PENDING' || status === 'ANALYSING' || status === 'FAILED') && (
          <StatusWaitingCard
            status={status as 'PENDING' | 'ANALYSING' | 'FAILED'}
            onRetry={() => retryMutation.mutate()}
            retrying={retryMutation.isPending}
          />
        )}

        {/* ── Report ready ── */}
        <AnimatePresence>
          {status === 'REPORT_READY' && report && (
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">

              {/* ── Stats bar ── */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={16} weight="duotone" className="text-[var(--color-muted)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Class total</span>
                  </div>
                  <p className="text-4xl font-bold text-[var(--color-text)]">{totalStudents || '—'}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">students</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Strong progress</span>
                  </div>
                  <p className="text-4xl font-bold text-emerald-600">{totalStudents > 0 ? goodStudents : '—'}</p>
                  <p className="text-xs text-emerald-500 mt-1">students</p>
                </div>
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Warning size={16} weight="fill" className="text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Need support</span>
                  </div>
                  <p className="text-4xl font-bold text-amber-600">{attentionItems.length}</p>
                  <p className="text-xs text-amber-500 mt-1">students</p>
                </div>
              </motion.div>

              {/* ── AI Summary ── */}
              <motion.div variants={fadeUp} className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                    <ChartBar size={18} weight="duotone" className="text-[var(--color-primary)]" />
                  </div>
                  <h2 className="text-base font-bold text-[var(--color-text)]">AI analysis</h2>
                </div>
                <p className="text-[var(--color-muted)] leading-relaxed whitespace-pre-wrap">
                  {report.summary || 'No summary available.'}
                </p>
                {report.reasoning && (
                  <div className="mt-5 rounded-2xl bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] mb-2">Detailed reasoning</p>
                    <p className="text-sm text-[var(--color-text)] leading-relaxed">{report.reasoning}</p>
                  </div>
                )}
              </motion.div>

              {/* ── Attention students ── */}
              {attentionItems.length > 0 && (
                <motion.div variants={fadeUp} className="rounded-3xl border border-amber-200/60 bg-[var(--color-surface)] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Student size={18} weight="duotone" className="text-amber-600" />
                    </div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">Students needing attention</h2>
                    <span className="ml-auto rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1">{attentionItems.length} students</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {attentionItems.map((student) => (
                      <div key={student.student_id} className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-orange-50/30 p-5 hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-sm font-bold flex-shrink-0">
                            {(student.username || student.student_id)[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-amber-900">{student.username || student.student_id}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="rounded-xl bg-white/70 border border-amber-100 px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">Reason</p>
                            <p className="text-xs text-amber-800 leading-relaxed">{student.reason}</p>
                          </div>
                          <div className="rounded-xl bg-white/70 border border-amber-100 px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">Next step</p>
                            <p className="text-xs text-amber-800 leading-relaxed">{student.next_step}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Next lesson suggestion ── */}
              {nextOutcome && (nextOutcome.concept || nextOutcome.lesson_goal) && (
                <motion.div variants={fadeUp} className="rounded-3xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-transparent p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                      <Target size={18} weight="duotone" className="text-[var(--color-primary)]" />
                    </div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">Suggested next lesson</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {nextOutcome.concept && (
                      <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline-variant)] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Concept</p>
                        <p className="text-sm font-semibold text-[var(--color-text)]">{nextOutcome.concept}</p>
                      </div>
                    )}
                    {nextOutcome.lesson_goal && (
                      <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline-variant)] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Lesson goal</p>
                        <p className="text-sm font-semibold text-[var(--color-text)]">{nextOutcome.lesson_goal}</p>
                      </div>
                    )}
                  </div>
                  {nextOutcome.summary && (
                    <p className="mt-4 text-sm text-[var(--color-muted)] leading-relaxed">{nextOutcome.summary}</p>
                  )}
                </motion.div>
              )}

              {/* ── CTA Zone ── */}
              <motion.div variants={fadeUp} className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-7">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkle size={16} weight="duotone" className="text-[var(--color-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Next steps</h3>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-6">Choose the best action based on this report.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push(`/teacher/copilot/${lessonId}/extra`)}
                    className="flex-1 group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 px-6 py-4 text-left text-white shadow-xl shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/35 hover:-translate-y-0.5 transition-all"
                  >
                    <PlusCircle size={24} weight="fill" className="flex-shrink-0 opacity-90" />
                    <span>
                      <span className="block font-bold text-base">Create extra exercises</span>
                      <span className="text-xs text-white/70">AI automatically groups advanced and support learners</span>
                    </span>
                    <ArrowRight size={16} className="ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                  <button
                    onClick={continueCurriculum}
                    className="flex-1 group flex items-center gap-3 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-6 py-4 text-left hover:border-[var(--color-primary)]/40 hover:-translate-y-0.5 transition-all"
                  >
                    <BookOpen size={24} weight="duotone" className="text-[var(--color-primary)] flex-shrink-0" />
                    <span>
                      <span className="block font-bold text-[var(--color-text)]">Continue the curriculum</span>
                      <span className="text-xs text-[var(--color-muted)]">Create the next lesson from AI guidance</span>
                    </span>
                  </button>
                </div>
                <div className="mt-5 text-center">
                  <button
                    onClick={() => dismissMutation.mutate()}
                    disabled={dismissMutation.isPending}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    <XCircle size={12} />
                    {dismissMutation.isPending ? 'Closing...' : 'Mark as read and return to dashboard'}
                  </button>
                </div>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
