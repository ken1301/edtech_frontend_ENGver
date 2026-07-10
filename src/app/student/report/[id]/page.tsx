"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import type { AiTutorSessionSummary } from '@/lib/api/aiClient';

export default function RubricReport({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const [backLink, setBackLink] = React.useState('/student/roadmap');

  React.useEffect(() => {
    const currentClassId = localStorage.getItem('currentClassId');
    const searchParams = new URLSearchParams(window.location.search);
    const classParam = searchParams.get('class') || currentClassId;
    if (classParam) {
      setBackLink(`/student/roadmap?class=${classParam}`);
    }
  }, []);

  const formatDifficultyLabel = (level: string | null | undefined) => {
    if (level === 'easy') return 'Easy';
    if (level === 'medium') return 'Balanced';
    if (level === 'hard') return 'Advanced';
    return null;
  };

  const formatRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      reinforcement: 'Reinforcement',
      challenge: 'Challenge',
      exploration: 'Exploration',
      extension: 'Extension',
    };
    return labels[role] || role;
  };

  const translateKey = (key: string) => {
    if (!key) return '';
    const dict: Record<string, string> = {
      remember: 'Remember',
      understand: 'Understand',
      apply: 'Apply',
      analyze: 'Analyze',
      evaluate: 'Evaluate',
      create: 'Create',
      good_logic: 'Strong logic',
      fast_solver: 'Fast solving',
      accurate: 'Accuracy',
      creative: 'Creativity',
      careful: 'Carefulness',
      over_thinking: 'Overthinking',
      careless: 'Carelessness',
      stuck_easy: 'Gets stuck on easy tasks',
      slow: 'Slow pace',
      miscalculation: 'Miscalculation',
      definition: 'Definition',
      property: 'Property',
      method: 'Method',
      application: 'Application',
      common_mistake: 'Common mistake',
      misconception: 'Misconception',
      concept: 'Concept',
    };
    const norm = key.toLowerCase().trim().replace(/ /g, '_');
    return dict[norm] || dict[key] || key.replace(/_/g, ' ');
  };

  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['student', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/classes');
      return res.data?.classes || [];
    }
  });

  const classes = Array.isArray(classesData) ? classesData : [];

  const { data: reportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ['report', resolvedParams.id],
    queryFn: async () => {
      const res = await apiClient.get(`/student/report/${resolvedParams.id}`);
      return res.data;
    },
    enabled: classes.length > 0
  });

  const textContent = reportData?.textContent || "Loading evaluation...";
  const highlights = reportData?.highlights || [];
  const sessionSummary = (reportData?.sessionSummary || null) as AiTutorSessionSummary | null;
  const overallScore = typeof reportData?.sessionProgress === 'number'
    ? Math.round(reportData.sessionProgress)
    : reportData?.score || 0;
  const overallStatus = overallScore >= 50 ? 'PASSED' : 'FAILED';

  if (isLoadingClasses || (classes.length > 0 && isLoadingReport)) {
    return <div className="flex justify-center py-20 text-[var(--color-muted)]">Loading your evaluation report...</div>;
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-3xl max-w-md mx-auto mt-10 shadow-sm">
        <div className="text-4xl mb-4">!</div>
        <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">No class enrollment</h3>
        <p className="text-[var(--color-muted)]">You have not joined any class yet, so there is no learning history or evaluation report available.</p>
        <Link href="/student/dashboard" className="mt-6 px-6 py-2.5 bg-brand text-white font-semibold rounded-lg hover:opacity-90 transition-colors shadow-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const renderContent = () => {
    return (
      <div className="space-y-6">
        <div className="text-lg leading-relaxed text-[var(--color-muted)] p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-outline-variant)] whitespace-pre-wrap">
          {textContent}
        </div>

        {highlights.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="font-bold text-[var(--color-text)] text-sm uppercase tracking-wider">Detailed feedback</h4>
            {highlights.map((h: any, idx: number) => (
              <div key={idx} className={`p-3 rounded-lg border-l-4 flex flex-col gap-1 ${
                h.color.includes('emerald') ? 'bg-emerald-500/10 border-emerald-500' :
                h.color.includes('orange') ? 'bg-orange-500/10 border-orange-500' :
                'bg-brand/10 border-brand'
              }`}>
                <span className="font-semibold text-[var(--color-text)]">"{translateKey(h.word)}"</span>
                <span className="text-sm text-[var(--color-muted)]">{h.feedback || "Feedback generated by AI."}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!reportData) {
    return <div className="flex justify-center py-20 text-[var(--color-muted)]">Loading your evaluation report...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-on-surface)] mb-2">Lesson Review {resolvedParams.id}</h1>
          <p className="text-[var(--color-on-surface-variant)]">Here is your detailed AI-supported report for this lesson.</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-[var(--color-primary)]">{overallScore}<span className="text-xl text-[var(--color-muted)]">/100</span></div>
          <div className={`text-sm font-bold inline-block px-2 py-1 rounded mt-1 ${overallStatus === 'PASSED' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>{overallStatus}</div>
        </div>
      </div>

      {sessionSummary && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[var(--radius-2xl)] p-8 shadow-sm mb-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">AI Tutor Summary</h2>
              <p className="text-[var(--color-muted)] leading-7">{sessionSummary.summary}</p>
            </div>
            {sessionSummary.preferred_difficulty && (
              <div className="shrink-0 rounded-2xl bg-brand/10 px-4 py-3 text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Best-fit difficulty</div>
                <div className="text-sm font-semibold text-brand">{formatDifficultyLabel(sessionSummary.preferred_difficulty)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 mb-3">Strengths</h3>
              {sessionSummary.strengths.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sessionSummary.strengths.map((strength) => (
                    <span key={strength} className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700">
                      {translateKey(strength)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">No standout strength was recorded in this session.</p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-3">Watch points</h3>
              {sessionSummary.weaknesses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sessionSummary.weaknesses.map((weakness) => (
                    <span key={weakness} className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-700">
                      {translateKey(weakness)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">No major warning signs were detected in this session.</p>
              )}
            </div>
          </div>

          {(sessionSummary.mastering_at.length > 0 || sessionSummary.struggling_at.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] mb-3">Doing well</h3>
                {sessionSummary.mastering_at.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sessionSummary.mastering_at.map((item) => (
                      <span key={item} className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700">
                        {translateKey(item)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-muted)]">No specific mastery data has been recorded yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] mb-3">Needs more practice</h3>
                {sessionSummary.struggling_at.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sessionSummary.struggling_at.map((item) => (
                      <span key={item} className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-700">
                        {translateKey(item)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-muted)]">No weak knowledge area has been flagged yet.</p>
                )}
              </div>
            </div>
          )}

          {Object.keys(sessionSummary.finished_exercise).length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] mb-4">Performance by problem role</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(sessionSummary.finished_exercise).map(([role, performance]) => (
                  <div key={role} className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-semibold text-[var(--color-text)]">{formatRoleLabel(role)}</span>
                      <span className="text-sm font-bold text-brand">{Math.round(performance.score * 100)}%</span>
                    </div>
                    <div className="w-full bg-[var(--color-outline-variant)] h-1.5 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-[var(--color-primary)]" style={{ width: `${Math.round(performance.score * 100)}%` }}></div>
                    </div>
                    <p className="text-sm text-[var(--color-muted)] mb-3">Bloom level: {translateKey(performance.bloom_level)}</p>
                    {(performance.strengths.length > 0 || performance.weaknesses.length > 0) && (
                      <div className="space-y-2 text-sm">
                        {performance.strengths.length > 0 && (
                          <p className="text-emerald-700">Strong at: {performance.strengths.map(translateKey).join(', ')}</p>
                        )}
                        {performance.weaknesses.length > 0 && (
                          <p className="text-orange-700">Needs attention: {performance.weaknesses.map(translateKey).join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-[var(--radius-2xl)] p-8 shadow-sm mb-8">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-6 flex items-center gap-2">
          <span className="text-xl">*</span> Heatmap Analysis
        </h2>
        <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-6 mb-6 font-[var(--font-sans)]">
          {renderContent()}
        </div>

        <div className="flex gap-4 border-t border-[var(--color-outline-variant)] pt-6">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span className="w-3 h-3 rounded-full bg-brand/20 border border-brand/40"></span> Strategy setup
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span className="w-3 h-3 rounded-full bg-orange-500/20 border border-orange-500/40"></span> Warning / minor issue
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40"></span> Accurate execution
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href={backLink} className="px-6 py-3 bg-brand text-white rounded-[var(--radius-lg)] font-medium hover:opacity-90 transition-colors shadow-sm">
          Back to roadmap
        </Link>
      </div>
    </div>
  );
}
