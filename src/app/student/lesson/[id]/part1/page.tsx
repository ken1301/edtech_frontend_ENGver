'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LucideCheckCircle, LucideXCircle, LucideArrowRight, LucideBookOpen, LucideHelpCircle, LucideArrowLeft } from 'lucide-react';
import SafeMarkdown from '@/components/SafeMarkdown';
import 'katex/dist/katex.min.css';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { trackEvent, EVENTS } from '@/lib/tracking';

type Lesson1KnowledgeItem = {
  content_type?: string;
  title?: string;
  content?: string;
  is_core?: boolean;
  from_source?: boolean;
};

type Lesson1Knowledge = {
  concept_name?: string;
  hook_type?: string;
  hook?: string;
  prerequisites?: string[];
  items?: Lesson1KnowledgeItem[];
};

type LessonQuestionOption = {
  label: string;
  text: string;
};

type LessonQuestion = {
  id: string;
  text?: string;
  questionText?: string;
  options?: LessonQuestionOption[];
  correct?: string;
  correctAnswer?: string;
  explanation?: string;
};

type LessonExercise = {
  title?: string;
  description?: string;
  material?: string;
  lesson1Knowledge?: Lesson1Knowledge | null;
  questions?: LessonQuestion[];
};

export default function LessonPart1View({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [backLink, setBackLink] = useState('/student/roadmap');

  const { data: lessonData, isLoading } = useQuery<LessonExercise>({
    queryKey: ['exercise', resolvedParams.id],
    queryFn: async () => {
      const res = await apiClient.get(`/student/exercises/${resolvedParams.id}`);
      return res.data;
    }
  });

  useEffect(() => {
    if (resolvedParams.id) {
      trackEvent(EVENTS.LESSON_STARTED, { lessonId: resolvedParams.id });
      const currentClassId = localStorage.getItem('currentClassId');
      const searchParams = new URLSearchParams(window.location.search);
      const classParam = searchParams.get('class') || currentClassId;
      if (classParam) {
        setBackLink(`/student/roadmap?class=${classParam}`);
      }

      queueMicrotask(() => {
        setIsLoaded(true);
      });
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    // Progress persistence intentionally disabled.
  }, [answers, submitted, isLoaded, resolvedParams.id]);

  const quizStartedRef = React.useRef(false);
  const contentCompletedRef = React.useRef(false);

  const handleSelect = (qId: string, value: string) => {
    if (!quizStartedRef.current) {
      trackEvent(EVENTS.LESSON_QUIZ_STARTED, { lessonId: resolvedParams.id });
      quizStartedRef.current = true;
    }
    if (!submitted[qId]) {
      setAnswers(prev => ({ ...prev, [qId]: value }));
    }
  };

  const handleSubmit = (qId: string) => {
    if (answers[qId]) {
      setSubmitted(prev => ({ ...prev, [qId]: true }));
    }
  };

  const handleRetry = (qId: string) => {
    setSubmitted(prev => ({ ...prev, [qId]: false }));
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[qId];
      return newAnswers;
    });
  };

  const allSubmitted = lessonData?.questions && lessonData.questions.length > 0
    ? lessonData.questions.every((q) => submitted[q.id])
    : false;

  if (isLoading || !lessonData || !isLoaded) {
    return <div className="flex h-screen items-center justify-center">Loading lesson...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-surface)]">
      <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={backLink} className="p-2 text-[var(--color-muted)] hover:bg-[var(--color-outline-variant)] rounded-lg transition-colors mr-2">
            <LucideArrowLeft className="w-5 h-5" />
          </Link>
          <span className="px-3 py-1 bg-brand/10 text-[var(--color-primary)] text-xs font-bold rounded-lg uppercase tracking-wider">Part 1</span>
          <h1 className="font-bold text-[var(--color-text)] text-lg">{lessonData.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-[var(--color-muted)]">
            Progress: {Object.keys(submitted).length} / {lessonData.questions?.length || 0} completed
          </div>
          <div className="w-48 h-2 bg-[var(--color-outline-variant)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${lessonData.questions?.length ? (Object.keys(submitted).length / lessonData.questions.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section
          className="w-1/2 overflow-y-auto border-r border-[var(--color-outline-variant)] bg-[var(--color-surface)]"
          onScroll={(e) => {
            const target = e.currentTarget;
            const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
            if (scrollPercentage > 0.25 && scrollPercentage < 0.5) trackEvent(EVENTS.LESSON_SCROLL_DEPTH, { depth: '25%', lessonId: resolvedParams.id });
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
              if (!contentCompletedRef.current) {
                trackEvent(EVENTS.LESSON_CONTENT_COMPLETED, { lessonId: resolvedParams.id });
                contentCompletedRef.current = true;
              }
            }
          }}
        >
          <div className="p-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-[var(--color-primary)]">
              <LucideBookOpen className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Theory</h2>
            </div>

            <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
              {lessonData.lesson1Knowledge ? (
                <div className="space-y-6">
                  {lessonData.title && (
                    <div>
                      <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3">{lessonData.title}</h3>
                    </div>
                  )}

                  {lessonData.lesson1Knowledge.hook && (
                    <div className="rounded-2xl border border-brand/20 bg-brand/10 p-5">
                      <div className="mb-2 text-sm font-semibold text-[var(--color-primary)]">Why this matters</div>
                      <SafeMarkdown>{lessonData.lesson1Knowledge.hook}</SafeMarkdown>
                    </div>
                  )}

                  {(lessonData.lesson1Knowledge.prerequisites?.length ?? 0) > 0 && (
                    <div>
                      <div className="mb-3 text-sm font-semibold text-[var(--color-text)]">Prerequisites</div>
                      <div className="flex flex-wrap gap-2">
                        {lessonData.lesson1Knowledge.prerequisites?.map((item: string) => (
                          <span key={item} className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lessonData.lesson1Knowledge.items?.map((item: Lesson1KnowledgeItem, idx: number) => (
                    <div key={`${item.title || 'item'}-${idx}`} className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-[var(--color-text)] !m-0">{item.title}</h4>
                        {item.is_core && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 leading-none">Core</span>}
                        {item.from_source === false && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 leading-none">AI Expanded</span>}
                      </div>
                      <SafeMarkdown>{item.content || ''}</SafeMarkdown>
                    </div>
                  ))}
                </div>
              ) : (
                <SafeMarkdown>
                  {(lessonData.description || lessonData.material || '').replace(/^#\s+[a-zA-Z0-9_]+(\r?\n|$)/, `# ${lessonData.title}$1`)}
                </SafeMarkdown>
              )}
            </div>
          </div>
        </section>

        <section className="w-1/2 overflow-y-auto bg-[var(--color-surface-container-high)] px-8 pb-8 relative">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-8 pt-8 pb-4 text-[var(--color-text)] sticky top-0 bg-[var(--color-surface-container-high)] z-10">
              <LucideHelpCircle className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Foundational quiz</h2>
            </div>

            <div className="space-y-8">
              {lessonData.questions?.map((q, idx: number) => {
                const isSubmitted = submitted[q.id];
                const selectedAnswer = answers[q.id];

                const correctAnswer = q.correct || q.correctAnswer || '';
                const isCorrect = q.options && q.options.length > 0
                  ? selectedAnswer === correctAnswer
                  : selectedAnswer?.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

                const isShortAnswer = !q.options || q.options.length === 0;

                return (
                  <div key={q.id} className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-sm">
                    <div className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-start">
                      <span className="text-[var(--color-primary)] mr-2 pt-0.5">Q{idx + 1}.</span>
                      <SafeMarkdown className="flex-1 [&>p]:m-0">
                        {q.text || q.questionText || ''}
                      </SafeMarkdown>
                    </div>

                    <div className="space-y-3">
                      {isShortAnswer ? (
                        <div className="mt-4">
                          <input
                            type="text"
                            value={selectedAnswer || ''}
                            onChange={(e) => handleSelect(q.id, e.target.value)}
                            disabled={isSubmitted}
                            placeholder="Enter your answer..."
                            className={`w-full p-4 border-2 rounded-xl outline-none transition-colors ${
                              isSubmitted
                                ? (isCorrect ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-rose-500 bg-rose-500/10 text-rose-300')
                                : 'border-[var(--color-outline-variant)] focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-[var(--color-text)]'
                            }`}
                          />
                        </div>
                      ) : (
                        q.options?.map((opt) => {
                          const isSelected = selectedAnswer === opt.label;
                          let optionClass = 'border-[var(--color-outline-variant)] hover:border-brand/50 hover:bg-brand/10 text-slate-200';

                          if (isSelected) {
                            optionClass = 'border-[var(--color-primary)] bg-brand/10 text-[var(--color-primary)] font-medium';
                          }

                          if (isSubmitted) {
                            if (opt.label === correctAnswer) {
                              optionClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-medium';
                            } else if (isSelected && !isCorrect) {
                              optionClass = 'border-rose-500 bg-rose-500/10 text-rose-300 font-medium';
                            } else {
                              optionClass = 'border-[var(--color-outline-variant)] text-slate-400 opacity-70';
                            }
                          }

                          return (
                            <div
                              key={opt.label}
                              onClick={() => handleSelect(q.id, opt.label)}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${optionClass} ${isSubmitted ? 'pointer-events-none' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isSelected && !isSubmitted ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-outline-variant)]'}`}>
                                  {opt.label}
                                </div>
                                <SafeMarkdown className="flex-1 [&>p]:m-0">{opt.text || ''}</SafeMarkdown>
                              </div>

                              {isSubmitted && opt.label === correctAnswer && <LucideCheckCircle className="text-emerald-500 w-6 h-6" />}
                              {isSubmitted && isSelected && !isCorrect && <LucideXCircle className="text-rose-500 w-6 h-6" />}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-6 flex justify-end">
                      {!isSubmitted ? (
                        <button
                          onClick={() => handleSubmit(q.id)}
                          disabled={!selectedAnswer || selectedAnswer.trim() === ''}
                          className="px-6 py-2 bg-[var(--color-primary)] text-white hover:opacity-90 text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                          Check answer
                        </button>
                      ) : !isCorrect ? (
                        <button
                          onClick={() => handleRetry(q.id)}
                          className="px-6 py-2 bg-[var(--color-outline-variant)] text-[var(--color-muted)] hover:bg-[var(--color-outline-variant)] text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                          Try again
                        </button>
                      ) : null}
                    </div>
                    {isSubmitted && (
                      <div className={`mt-4 py-3 px-4 rounded-lg border-l-4 ${isCorrect ? 'bg-emerald-500/5 border-emerald-500' : 'bg-rose-500/5 border-rose-500'}`}>
                        <p className={`font-semibold text-sm mb-1 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCorrect ? 'Correct' : 'Not correct yet'}
                        </p>
                        {isShortAnswer && !isCorrect && (
                          <p className="text-sm font-medium text-rose-400 mb-2">Correct answer: {correctAnswer}</p>
                        )}
                        <SafeMarkdown className="text-sm text-slate-300 mt-2">{q.explanation || ''}</SafeMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allSubmitted && (
              <div className="mt-10 p-6 bg-brand/10 border border-brand/30 rounded-2xl text-center">
                <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">Great work!</h3>
                <p className="text-[var(--color-muted)] mb-6 text-sm">You have completed the foundational check. Continue to Part 2 to work with the AI Tutor in a deeper problem-solving flow.</p>
                <Link
                  href={`/student/lesson/${resolvedParams.id}/part2`}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-colors shadow-sm"
                >
                  Continue to Part 2 <LucideArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
