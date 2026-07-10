'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, CheckCircle, Warning, Brain, Users, Star,
  Lightning, CaretDown, CaretUp, Sparkle
} from '@phosphor-icons/react';
import apiClient from '@/lib/apiClient';
import SafeMarkdown from '@/components/SafeMarkdown';

interface ExtraDraft {
  id: string;
  groupType: 'advanced' | 'remedial';
  summary: string;
  studentIds: string[];
  exercises: Record<string, unknown>[];
}

const processMath = (text: string | undefined | null) => {
  if (!text) return '';
  return text
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/__/g, '\\_\\_');
};

// ─── Publishing Overlay ──────────────────────────────────────────────────────
function PublishingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-surface)]/90 backdrop-blur-md"
    >
      <div className="relative flex items-center justify-center w-28 h-28 mb-8">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-emerald-500/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border-4 border-emerald-500/30"
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
        />
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-emerald-400/30 border-t-emerald-500 relative z-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <motion.p
        className="text-xl font-bold text-[var(--color-text)] mb-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Publishing exercises...
      </motion.p>
      <motion.p
        className="text-sm text-[var(--color-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Sending them to each student group
      </motion.p>
    </motion.div>
  );
}

function AIThinkingLoader() {
  const steps = [
    'Analyzing learning results...',
    'Grouping students by support needs...',
    'Generating the right exercises for each group...',
  ];
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-16 text-center">
      {/* Brain pulse */}
      <div className="relative mx-auto w-20 h-20 flex items-center justify-center mb-8">
        <motion.div
          className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-3 rounded-full bg-[var(--color-primary)]/15"
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
        />
        <Brain size={36} weight="duotone" className="text-[var(--color-primary)] relative z-10" />
      </div>

      {/* Animated step text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={stepIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="text-base font-medium text-[var(--color-text)] mb-2"
        >
          {steps[stepIdx]}
        </motion.p>
      </AnimatePresence>

      <p className="text-sm text-[var(--color-muted)] mb-8">This process may take 10-30 seconds</p>

      {/* Skeleton shimmer cards */}
      <div className="space-y-4 max-w-lg mx-auto text-left">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="h-28 rounded-2xl bg-[var(--color-surface-container-high)] overflow-hidden relative"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, index }: { exercise: Record<string, unknown>; index: number }) {
  const [showAnswer, setShowAnswer] = React.useState(false);
  const question = (exercise.question || exercise.problem || exercise.summary || '') as string;
  const finalAnswer = exercise.final_answer as string | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
      className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Question</span>
      </div>
      <div className="prose prose-sm max-w-none text-[var(--color-text)]">
        <SafeMarkdown>{processMath(question)}</SafeMarkdown>
      </div>

      {finalAnswer && (
        <div className="mt-4">
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {showAnswer ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
            {showAnswer ? 'Hide answer' : 'Show answer'}
          </button>
          <AnimatePresence>
            {showAnswer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
                  <span className="font-semibold">Answer: </span>{finalAnswer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ─── Draft Card ───────────────────────────────────────────────────────────────
function DraftCard({ draft, index }: { draft: ExtraDraft; index: number }) {
  const isAdvanced = draft.groupType === 'advanced';

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
      className="rounded-3xl border overflow-hidden"
      style={{
        borderColor: isAdvanced ? 'rgb(233 213 255 / 0.6)' : 'rgb(254 215 170 / 0.6)',
      }}
    >
      {/* Card header */}
      <div className={`px-8 py-5 flex items-center gap-4 ${
        isAdvanced
          ? 'bg-gradient-to-r from-purple-50 to-purple-50/30'
          : 'bg-gradient-to-r from-amber-50 to-amber-50/30'
      }`}>
        <motion.div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
            isAdvanced ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30' : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'
          }`}
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {isAdvanced
            ? <Star size={22} weight="fill" className="text-white" />
            : <Lightning size={22} weight="fill" className="text-white" />}
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isAdvanced ? 'text-purple-700' : 'text-amber-700'}`}>
              {isAdvanced ? 'Advanced group' : 'Support group'}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
              isAdvanced
                ? 'bg-purple-50 border-purple-200 text-purple-600'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              {isAdvanced ? 'Advanced' : 'Remedial'}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Users size={12} className="text-[var(--color-muted)]" />
            <span className="text-xs text-[var(--color-muted)]">{draft.studentIds.length} students</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {draft.summary && (
        <div className="px-8 py-5 border-b border-[var(--color-outline-variant)]/50 bg-[var(--color-surface)]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">Group summary</p>
          <p className="text-sm text-[var(--color-text)] leading-relaxed">{draft.summary}</p>
        </div>
      )}

      {/* Exercises */}
      <div className="px-8 py-6 bg-[var(--color-surface)] space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {draft.exercises.length} exercises
        </p>
        {draft.exercises.map((ex, idx) => (
          <ExerciseCard key={idx} exercise={ex} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ lessonId }: { lessonId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-emerald-200 bg-emerald-50 p-16 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
        className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
      >
        <CheckCircle size={44} weight="fill" className="text-emerald-500" />
      </motion.div>
      <h3 className="text-2xl font-bold text-emerald-800 mb-3">Published successfully!</h3>
      <p className="text-sm text-emerald-700 max-w-sm mx-auto mb-8 leading-relaxed">
        Extra exercises have been sent to each student group. Students can access them immediately from the learning roadmap.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href={`/teacher/copilot/${lessonId}`}
          className="px-6 py-3 rounded-xl border border-emerald-300 bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
        >
          View report
        </Link>
        <Link
          href="/teacher/dashboard"
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-md"
        >
          Back to dashboard
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CopilotExtraExercisesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lessonId = params.lessonId as string;
  const [drafts, setDrafts] = React.useState<ExtraDraft[]>([]);
  const [published, setPublished] = React.useState(false);
  const [lessonTitle, setLessonTitle] = React.useState('');
  const [classNames, setClassNames] = React.useState('');

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/teacher/copilot/${lessonId}/extra-exercises`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.created && data.drafts) {
        setDrafts(data.drafts);
        setLessonTitle(data.lessonTitle || '');
        setClassNames(data.classNames || '');
      } else {
        setDrafts([]);
        setLessonTitle(data.lessonTitle || '');
        setClassNames(data.classNames || '');
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/teacher/copilot/${lessonId}/extra-exercises/publish`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'copilot', lessonId, 'report'] });
      // Small delay for the overlay animation before showing success
      setTimeout(() => setPublished(true), 600);
    },
  });

  React.useEffect(() => {
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const isLoading = generateMutation.isPending;
  const isPublishing = publishMutation.isPending;
  const isError = generateMutation.isError;
  const hasDrafts = drafts.length > 0;
  const isEmpty = !isLoading && !isError && !hasDrafts && !published;

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain">

      {/* Publishing overlay */}
      <AnimatePresence>
        {isPublishing && <PublishingOverlay />}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-4xl py-10 px-6 pb-32">

        {/* Header */}
        <div className="mb-8">
          <Link href={`/teacher/copilot/${lessonId}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline mb-3">
            <ArrowLeft size={14} />Back to report
          </Link>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mt-1">
              <Sparkle size={20} weight="duotone" className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight">Grouped extra exercises</h1>
              <p className="text-xs text-[var(--color-muted)] mt-1">AI automatically groups students and creates suitable exercises</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-muted)] mt-2">
                {classNames && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                    <span className="font-medium text-[var(--color-on-surface-variant)]">Class:</span>
                    <span className="font-semibold text-[var(--color-text)] bg-[var(--color-surface-container-high)] px-2 py-0.5 rounded-md">
                      {classNames}
                    </span>
                  </div>
                )}
                {lessonTitle && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="font-medium">Lesson:</span>
                    <span className="font-semibold text-[var(--color-text)]">{lessonTitle}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Loading */}
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AIThinkingLoader />
            </motion.div>
          )}

          {/* Error */}
          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-rose-200 bg-rose-50 p-12 text-center"
            >
              <Warning size={44} weight="duotone" className="mx-auto mb-4 text-rose-500" />
              <h3 className="text-lg font-bold text-rose-800 mb-2">Unable to generate extra exercises</h3>
              <p className="text-sm text-rose-700 mb-8">An error occurred. Please try again.</p>
              <button
                onClick={() => generateMutation.mutate()}
                className="px-6 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700"
              >
                Retry
              </button>
            </motion.div>
          )}

          {/* Empty */}
          {isEmpty && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-12 text-center"
            >
              <CheckCircle size={44} weight="duotone" className="mx-auto mb-4 text-emerald-500" />
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">No extra exercises needed</h3>
              <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto mb-8 leading-relaxed">
                Based on Copilot's analysis, the full class is progressing well. You can continue the curriculum.
              </p>
              <Link
                href={`/teacher/copilot/${lessonId}`}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90"
              >
                Back to report
              </Link>
            </motion.div>
          )}

          {/* Success */}
          {published && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SuccessScreen lessonId={lessonId} />
            </motion.div>
          )}

          {/* Drafts */}
          {hasDrafts && !published && (
            <motion.div key="drafts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {drafts.map((draft, i) => (
                <DraftCard key={draft.id} draft={draft} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky publish bar */}
      <AnimatePresence>
        {hasDrafts && !published && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)]/90 backdrop-blur-md"
          >
            <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{drafts.length} exercise groups ready</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {drafts.reduce((acc, d) => acc + d.studentIds.length, 0)} students will receive assignments
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/teacher/copilot/${lessonId}`}
                  className="px-5 py-2.5 rounded-xl border border-[var(--color-outline-variant)] text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface-container-high)] transition-colors"
                >
                  Back
                </Link>
                <button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  {publishMutation.isPending ? (
                    <>
                      <motion.div
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} weight="fill" />
                      Publish extra exercises
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
