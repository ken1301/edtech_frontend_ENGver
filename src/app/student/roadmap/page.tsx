'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CheckCircle, Play, Lightning, Star, ArrowRight, Warning } from '@phosphor-icons/react';
import apiClient from '@/lib/apiClient';

interface ClassData {
  class_id: string;
  class_name: string;
  description: string;
}

interface LessonData {
  id: string;
  lessonId: string;
  title: string;
  status: 'locked' | 'active' | 'completed';
  extra_exercises?: Array<{
    group_type: 'advanced' | 'remedial';
    summary: string;
    exercises: Array<Record<string, unknown>>;
  }>;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const nodeVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

function ExtraLessonBadge({ lesson, targetClassId }: { lesson: LessonData; targetClassId: string }) {
  const extras = lesson.extra_exercises ?? [];
  if (extras.length === 0) return null;

  return (
    <Link
      href={`/student/lesson/${lesson.lessonId}/extra?class=${targetClassId}`}
      className="group inline-flex w-full sm:max-w-sm items-center gap-4 rounded-2xl border border-[var(--color-primary)]/25 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 px-5 py-4 text-left shadow-sm transition-all hover:border-[var(--color-primary)]/50 hover:shadow-md hover:-translate-y-0.5"
    >
      <span className="flex flex-col flex-1 leading-tight min-w-0">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-1">
          AI Recommendation
        </span>
        <span className="text-[15px] font-semibold text-[var(--color-text)] truncate">
          Personalized practice set
        </span>
        <span className="text-[13px] text-[var(--color-muted)] mt-1.5 flex items-center gap-1.5">
          <Star weight="fill" size={12} className="text-amber-500" />
          Tailored by AI analysis
        </span>
      </span>
      <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-outline-variant)] shadow-sm text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
        <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function LearningPathContent() {
  const searchParams = useSearchParams();
  const classIdParam = searchParams?.get('class');

  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['student', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/classes');
      return res.data?.classes || [];
    },
  });

  const classes = Array.isArray(classesData) ? classesData : [];
  let targetClassId = classIdParam;
  if (!targetClassId && classes.length > 0) {
    targetClassId = classes[0].class_id;
  }

  const { data: roadmapData, isLoading: isLoadingRoadmap } = useQuery({
    queryKey: ['roadmap', targetClassId],
    queryFn: async () => {
      if (!targetClassId) return null;
      const res = await apiClient.get(`/student/classes/${targetClassId}/roadmap`);
      return Array.isArray(res.data) ? (res.data as LessonData[]) : [];
    },
    enabled: !!targetClassId,
  });

  if (isLoadingClasses || (targetClassId && isLoadingRoadmap)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"
              animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--color-muted)]">Loading your learning roadmap...</p>
      </div>
    );
  }

  const belongsToClass = classes.some((c: ClassData) => c.class_id === targetClassId);

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-3xl max-w-md mx-auto mt-10 shadow-sm">
        <Warning size={40} weight="duotone" className="text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">No enrolled classes yet</h3>
        <p className="text-[var(--color-muted)]">Join a class from your dashboard to unlock the roadmap and begin the guided learning flow.</p>
        <Link href="/student/dashboard" className="mt-6 px-6 py-2.5 bg-brand text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (targetClassId && !belongsToClass) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-[var(--color-surface)] border border-rose-200 rounded-3xl max-w-md mx-auto mt-10 shadow-sm">
        <Warning size={40} weight="duotone" className="text-rose-400 mb-4" />
        <h3 className="text-xl font-bold text-rose-400 mb-2">Class access unavailable</h3>
        <p className="text-[var(--color-muted)]">You do not belong to this class, or you do not have permission to access its learning roadmap.</p>
        <Link href="/student/dashboard" className="mt-6 px-6 py-2.5 bg-brand text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const currentClass = classes.find((c: ClassData) => c.class_id === targetClassId);
  const lessons = Array.isArray(roadmapData) ? roadmapData : [];
  const completedCount = lessons.filter((l: LessonData) => l.status === 'completed').length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="relative flex flex-col items-center bg-transparent min-h-[calc(100vh-4rem)] p-4 md:p-[var(--spacing-margin-desktop)]">
      {classes.length > 1 && (
        <div className="w-full max-w-2xl mb-4 flex gap-2 overflow-x-auto pb-1">
          {classes.map((c: ClassData) => (
            <Link
              key={c.class_id}
              href={`/student/roadmap?class=${c.class_id}`}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                c.class_id === targetClassId
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              {c.class_name}
            </Link>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl mb-10 text-center"
      >
        <h2 className="text-[34px] leading-[42px] tracking-[-0.02em] font-bold text-[var(--color-text)] mb-1">
          {currentClass?.class_name || 'Learning Roadmap'}
        </h2>
        <p className="text-base text-[var(--color-on-surface-variant)] mb-6">
          {currentClass?.description || 'Track your progress and continue step by step.'}
        </p>

        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-[var(--color-muted)]">{completedCount}/{totalCount} lessons</span>
          <div className="flex-1 max-w-xs h-2 bg-[var(--color-outline-variant)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          </div>
          <span className="text-sm font-bold text-emerald-600">{Math.round(progressPercent)}%</span>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-2xl mx-auto py-4 px-4 flex flex-col gap-8"
      >
        <div className="absolute top-8 bottom-8 left-[3.5rem] w-[2px] bg-[var(--color-outline-variant)] z-0 rounded-full" />

        {lessons.map((lesson: LessonData, index: number) => {
          const isCompleted = lesson.status === 'completed';
          const hasExtras = (lesson.extra_exercises?.length ?? 0) > 0;

          return (
            <div key={lesson.id || index} className="flex flex-col gap-6 w-full relative z-10">
              <motion.div
                variants={nodeVariants}
                className="relative z-10 flex flex-row items-start gap-6 w-full"
              >
                <div className="w-20 flex-shrink-0 flex justify-center pt-1">
                  {isCompleted ? (
                    <Link
                      href={`/student/lesson/${lesson.id}/part1?class=${targetClassId}`}
                      className="group relative w-16 h-16 rounded-full bg-emerald-500 border-4 border-[var(--color-surface)] shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-emerald-500/40"
                    >
                      <CheckCircle weight="fill" size={28} className="transition-all duration-300 group-hover:scale-0 group-hover:opacity-0 absolute" />
                      <span className="text-lg font-bold transition-all duration-300 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 absolute">{index + 1}</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/student/lesson/${lesson.id}/part1?class=${targetClassId}`}
                      className="group relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] shadow-sm flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md"
                    >
                      <span className="text-xl font-bold text-[var(--color-muted)] transition-all duration-300 group-hover:opacity-0 group-hover:scale-150 absolute">{index + 1}</span>
                      <Play weight="fill" size={22} className="text-[var(--color-primary)] ml-1 transition-all duration-300 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 absolute" />
                    </Link>
                  )}
                </div>

                <div className="flex flex-col items-start flex-1 min-w-0 pt-2">
                  <Link
                    href={`/student/lesson/${lesson.id}/part1?class=${targetClassId}`}
                    className={`inline-block text-[18px] font-semibold px-5 py-3.5 rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isCompleted
                        ? 'bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {lesson.title}
                  </Link>
                </div>
              </motion.div>

              {hasExtras && targetClassId && (
                <motion.div variants={nodeVariants} className="relative z-10 flex flex-row items-start gap-6 w-full">
                  <div className="w-20 flex-shrink-0 flex justify-center pt-2 relative">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border-[3px] border-[var(--color-surface)] shadow-[0_0_0_2px_var(--color-primary)] flex items-center justify-center relative z-10 opacity-90">
                      <Lightning weight="fill" size={16} className="text-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <ExtraLessonBadge lesson={lesson} targetClassId={targetClassId} />
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function LearningPath() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      }
    >
      <LearningPathContent />
    </Suspense>
  );
}
