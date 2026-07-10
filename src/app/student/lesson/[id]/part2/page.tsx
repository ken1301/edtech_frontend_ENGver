'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LucideSend,
  LucideCheckCircle2,
  LucideMenu,
  LucideLock,
  LucideCheck,
} from 'lucide-react';
import { ComplexProblem } from '@/lib/types/exercise.types';
import { aiClient, AiTutorSessionSummary, isAiTutorErrorResponse } from '@/lib/api/aiClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import SafeMarkdown from '@/components/SafeMarkdown';
import { trackEvent, EVENTS } from '@/lib/tracking';
import 'katex/dist/katex.min.css';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isSubmission?: boolean;
  isCorrect?: boolean | null;
}

const TiptapEditor = ({ content, onChange }: { content: string; onChange: (v: string) => void }) => {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Draft your solution here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-full text-[var(--color-text)] text-[15px] leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col border border-[var(--color-outline-variant)] rounded-xl overflow-hidden bg-[var(--color-surface)] h-full shadow-sm">
      <div className="flex flex-wrap gap-2 p-2 bg-[var(--color-surface-container-high)] border-b border-[var(--color-outline-variant)] shrink-0">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2.5 py-1.5 rounded-lg font-bold text-[var(--color-muted)] transition-colors ${editor.isActive('bold') ? 'bg-[var(--color-outline-variant)]' : 'hover:bg-[var(--color-outline-variant)]'}`}>B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2.5 py-1.5 rounded-lg italic text-[var(--color-muted)] transition-colors ${editor.isActive('italic') ? 'bg-[var(--color-outline-variant)]' : 'hover:bg-[var(--color-outline-variant)]'}`}>I</button>
        <div className="w-px h-6 bg-[var(--color-outline-variant)] mx-1 self-center"></div>
        <button onClick={() => editor.chain().focus().insertContent('x²').run()} className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-outline-variant)] flex items-center justify-center font-serif text-[var(--color-muted)] transition-colors" title="Superscript">x²</button>
        <button onClick={() => editor.chain().focus().insertContent('√').run()} className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-outline-variant)] flex items-center justify-center font-serif text-[var(--color-muted)] transition-colors" title="Square Root">√</button>
        <button onClick={() => editor.chain().focus().insertContent('π').run()} className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-outline-variant)] flex items-center justify-center font-serif text-[var(--color-muted)] transition-colors" title="Pi">π</button>
        <button onClick={() => editor.chain().focus().insertContent('∫').run()} className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-outline-variant)] flex items-center justify-center font-serif text-[var(--color-muted)] transition-colors" title="Integral">∫</button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto cursor-text bg-[var(--color-surface-container-high)]" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
};

export default function LessonPart2View({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);

  const [sessionClosed, setSessionClosed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<AiTutorSessionSummary | null>(null);

  const [problems, setProblems] = useState<ComplexProblem[]>([]);
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [currentProblemId, setCurrentProblemId] = useState<number | null>(null);
  const [completedProblemIds, setCompletedProblemIds] = useState<number[]>([]);
  const allProblemsCompleted = problems.length > 0 && completedProblemIds.length === problems.length;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedbacks, setSubmissionFeedbacks] = useState<Record<number, ChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedLessonIdRef = useRef<string | null>(null);
  const craftInteractedRef = useRef<boolean>(false);

  const [scratchpadContent, setScratchpadContent] = useState('');
  const [problemProgress, setProblemProgress] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (scratchpadContent && !craftInteractedRef.current && resolvedParams.id) {
      craftInteractedRef.current = true;
      trackEvent(EVENTS.LESSON_PART2_CRAFT_INTERACTED, { lessonId: resolvedParams.id });
    }
  }, [scratchpadContent, resolvedParams.id]);

  function readProgress(payload: { current_progress?: number; current_process?: number }) {
    return payload.current_progress !== undefined ? payload.current_progress : payload.current_process ?? 0;
  }

  function readCurrentProblemId(
    payload: { current_problem_id?: number | null },
    lessonProblems: ComplexProblem[],
  ) {
    if (typeof payload.current_problem_id === 'number') {
      return payload.current_problem_id;
    }
    return lessonProblems[0]?.problem_id ?? null;
  }

  function deriveCompletedProblemIds(
    lessonProblems: ComplexProblem[],
    progress: number,
    currentProblemIdValue: number | null,
  ) {
    const completedIds = new Set<number>();
    const currentProblemIdx =
      currentProblemIdValue === null
        ? -1
        : lessonProblems.findIndex(problem => problem.problem_id === currentProblemIdValue);

    lessonProblems.forEach((problem, idx) => {
      const threshold = (idx + 1) * 25;
      if (progress >= threshold || (currentProblemIdx >= 0 && idx < currentProblemIdx)) {
        completedIds.add(problem.problem_id);
      }
    });

    return [...completedIds];
  }

  function formatRoleLabel(role: string) {
    const labels: Record<string, string> = {
      reinforcement: 'Reinforcement',
      challenge: 'Challenge',
      exploration: 'Exploration',
      extension: 'Extension',
    };
    return labels[role] || role;
  }

  function translateKey(key: string) {
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
      stuck_easy: 'Stuck on easy tasks',
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
  }

  function formatDifficultyLabel(level: string | null) {
    if (level === 'easy') return 'Easy';
    if (level === 'medium') return 'Balanced';
    if (level === 'hard') return 'Advanced';
    return null;
  }

  const switchActiveProblem = (problemId: number) => {
    setActiveProblemId(problemId);
    setScratchpadContent('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initializedLessonIdRef.current === resolvedParams.id) {
      return;
    }

    initializedLessonIdRef.current = resolvedParams.id;

    const fetchSession = async () => {
      setIsInitializing(true);
      setInitError(null);
      try {
        let res = await aiClient.getActiveSession(resolvedParams.id);

        if (!res || res.status === 'not_found' || !res.session_id) {
          res = await aiClient.startSession(resolvedParams.id);
        }

        if (res.session_id) {
          setSessionId(res.session_id);
        }
        if (res.problems && res.problems.length > 0) {
          const lessonProblems = res.problems as ComplexProblem[];
          setProblems(lessonProblems);

          const progress = readProgress(res);
          const nextCurrentProblemId = readCurrentProblemId(res, lessonProblems);
          setProblemProgress(progress);
          setCurrentProblemId(nextCurrentProblemId);

          setCompletedProblemIds(
            deriveCompletedProblemIds(lessonProblems, progress, nextCurrentProblemId),
          );

          if (nextCurrentProblemId !== null) {
            switchActiveProblem(nextCurrentProblemId);
          } else {
            switchActiveProblem(lessonProblems[0].problem_id);
          }
        }

        if (!res.problems || res.problems.length === 0) {
          throw new Error('AI Tutor is not ready for this Part 2 lesson yet.');
        }

        setMessages([
          {
            id: 'init-1',
            sender: 'ai',
            text: `Hello! I am your AI Tutor. We have ${res.problems?.length || 4} problems to tackle today. I will guide you step by step. Start with the first problem and use the scratchpad to work it out.`,
            timestamp: new Date()
          }
        ]);
      } catch (err) {
        console.error(err);
        const message = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string; detail?: string } } }).response?.data?.detail
            || (err as { response?: { data?: { message?: string; detail?: string } } }).response?.data?.message
          : null;
        setInitError(message || 'Unable to initialize Part 2 with live AI data. Please try again later.');
      } finally {
        setIsInitializing(false);
      }
    };
    fetchSession();
  }, [resolvedParams.id]);

  const handleSendMessage = async (isSubmission = false, textOverride?: string) => {
    const currentMsg = textOverride || inputMsg;
    if (!currentMsg.trim() || sessionClosed) return;
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: currentMsg,
      timestamp: new Date(),
      isSubmission
    };

    if (isSubmission) {
      if (activeProblemId) {
        setSubmissionFeedbacks(prev => ({
          ...prev,
          [activeProblemId]: [...(prev[activeProblemId] || []), newMsg]
        }));
      }
      setSubmitMsg('');
      setIsSubmitting(true);
    } else {
      setMessages(prev => [...prev, newMsg]);
      setInputMsg('');
      setIsTyping(true);
    }

    try {
      if (!sessionId) {
        console.error('No active session ID - cannot send message');
        setIsTyping(false);
        setIsSubmitting(false);
        return;
      }

      const res = await aiClient.chat(sessionId, currentMsg, isSubmission, activeProblemId || 0);
      const aiResponse: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: res.reply || "I didn't quite catch that.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      if (isSubmission && activeProblemId) {
        setSubmissionFeedbacks(prev => {
          const list = prev[activeProblemId] || [];
          const msgIdx = list.findIndex(m => m.id === newMsg.id);
          if (msgIdx >= 0) {
            const newList = [...list];
            newList[msgIdx] = { ...newList[msgIdx], isCorrect: res.is_correct };
            return { ...prev, [activeProblemId]: newList };
          }
          return prev;
        });
      }

      if (
        res.current_progress !== undefined
        || res.current_process !== undefined
        || res.current_problem_id !== undefined
      ) {
        const progress = readProgress(res);
        const nextCurrentProblemId =
          typeof res.current_problem_id === 'number'
            ? res.current_problem_id
            : currentProblemId;
        setProblemProgress(progress);
        setCurrentProblemId(nextCurrentProblemId ?? null);

        setCompletedProblemIds(
          deriveCompletedProblemIds(problems, progress, nextCurrentProblemId ?? null),
        );

        if (typeof res.unlocked_problem_id === 'number') {
          switchActiveProblem(res.unlocked_problem_id);
        } else if (
          nextCurrentProblemId !== null &&
          nextCurrentProblemId !== activeProblemId
        ) {
          switchActiveProblem(nextCurrentProblemId);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const errorResponse = err as { response?: { data?: { message?: string } } };
      const errorMessage = errorResponse.response?.data?.message || 'There was a problem connecting to the AI Tutor. Please try again.';
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: errorMessage,
        timestamp: new Date()
      };
      if (isSubmission && activeProblemId) {
        setSubmissionFeedbacks(prev => ({
          ...prev,
          [activeProblemId]: [...(prev[activeProblemId] || []), errorMsg]
        }));
      } else {
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsTyping(false);
      setIsSubmitting(false);
    }
  };

  const handleSyncAndClose = async () => {
    if (!sessionId || sessionClosed || isClosingSession) return;

    setIsClosingSession(true);
    setCloseError(null);
    try {
      const response = await aiClient.closeSession(sessionId, resolvedParams.id);
      if (isAiTutorErrorResponse(response)) {
        setCloseError(response.message);
        return;
      }

      setSessionSummary(response);
      setSessionClosed(true);
      trackEvent(EVENTS.LESSON_PART2_EXITED, { lessonId: resolvedParams.id, progress: problemProgress });
      trackEvent(EVENTS.LESSON_PART2_PROGRESS, { lessonId: resolvedParams.id, progress: problemProgress });
    } catch (err) {
      console.error(err);
      setCloseError('Unable to sync the learning session result. Please try again.');
    } finally {
      setIsClosingSession(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--color-surface)] absolute inset-0 z-50 overflow-hidden">
      {isInitializing && (
        <div className="absolute inset-0 bg-[var(--color-surface)] z-[200] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Initializing AI Tutor...</h2>
          <p className="text-[var(--color-muted)] mt-2">Preparing your personalized learning session</p>
        </div>
      )}

      {!isInitializing && initError && (
        <div className="absolute inset-0 bg-[var(--color-surface)] z-[180] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-3xl border border-rose-500/20 bg-[var(--color-surface-container-high)] p-8 text-center shadow-xl">
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-3">Unable to open Part 2</h2>
            <p className="text-[var(--color-muted)] mb-6">{initError}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-colors"
              >
                Retry
              </button>
              <Link
                href={`/student/lesson/${resolvedParams.id}/part1`}
                className="px-5 py-3 rounded-xl border border-[var(--color-outline-variant)] text-[var(--color-text)] font-semibold hover:bg-[var(--color-surface-container-high)] transition-colors"
              >
                Back to Part 1
              </Link>
            </div>
          </div>
        </div>
      )}

      {(sessionClosed || isClosingSession || closeError) && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <div className="bg-[var(--color-surface)] p-6 sm:p-8 rounded-3xl max-w-2xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto shadow-2xl text-center">
            {isClosingSession && !sessionClosed && !closeError && (
              <>
                <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Wrapping up your session</h2>
                <p className="text-[var(--color-muted)]">The AI Tutor is generating your final summary and feedback.</p>
              </>
            )}

            {closeError && !sessionClosed && (
              <>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Unable to close session</h2>
                <p className="text-[var(--color-muted)] mb-6">{closeError}</p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleSyncAndClose} className="px-5 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-colors">
                    Retry
                  </button>
                  <button onClick={() => setCloseError(null)} className="px-5 py-3 rounded-xl border border-[var(--color-outline-variant)] text-[var(--color-text)] font-semibold hover:bg-[var(--color-surface-container-high)] transition-colors">
                    Return to lesson
                  </button>
                </div>
              </>
            )}

            {sessionClosed && sessionSummary && (
              <>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Session complete</h2>
                <p className="text-[var(--color-muted)] mb-8">{sessionSummary.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
                  {sessionSummary.preferred_difficulty && (
                    <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
                      <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Best-fit difficulty</div>
                      <div className="text-sm font-semibold text-brand">{formatDifficultyLabel(sessionSummary.preferred_difficulty)}</div>
                    </div>
                  )}
                  {sessionSummary.strengths.length > 0 && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-2">Strengths shown</div>
                      <div className="flex flex-wrap gap-2">
                        {sessionSummary.strengths.map((item) => (
                          <span key={item} className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700">
                            {translateKey(item)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {sessionSummary.weaknesses.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 md:col-span-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Areas to watch</div>
                      <div className="flex flex-wrap gap-2">
                        {sessionSummary.weaknesses.map((item) => (
                          <span key={item} className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-700">
                            {translateKey(item)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(sessionSummary.finished_exercise).length > 0 && (
                    <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5 md:col-span-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">Performance by problem role</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(sessionSummary.finished_exercise).map(([role, performance]) => (
                          <div key={role} className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-[var(--color-text)]">{formatRoleLabel(role)}</span>
                              <span className="text-sm font-bold text-brand">{Math.round(performance.score * 100)}%</span>
                            </div>
                            <div className="text-sm text-[var(--color-muted)]">Bloom: {translateKey(performance.bloom_level)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link href={`/student/report/${resolvedParams.id}`} className="block w-full py-3 bg-brand text-white font-semibold rounded-xl hover:opacity-90 transition-colors">
                  View lesson report
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <aside className={`${isSidebarOpen ? 'w-[420px]' : 'w-0'} transition-all duration-300 ease-in-out bg-[var(--color-surface-container-high)] border-r border-[var(--color-outline-variant)] flex flex-col shrink-0 overflow-hidden relative z-20`}>
          <div className="p-4 border-b border-[var(--color-outline-variant)] flex items-center justify-between min-w-[280px] shrink-0">
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              <LucideMenu className="w-4 h-4 cursor-pointer" onClick={() => setIsSidebarOpen(false)} /> Challenges
            </h2>
            <button
              onClick={handleSyncAndClose}
              disabled={isClosingSession}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-60 ${
                allProblemsCompleted
                  ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg animate-pulse ring-4 ring-rose-500/30'
                  : 'text-[var(--color-primary)] hover:underline'
              }`}
            >
              Exit
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[280px]">
            {problems.map((p, idx) => {
              const isCompleted = completedProblemIds.includes(p.problem_id);
              const isActive = activeProblemId === p.problem_id;
              const unlockedProblemIdx =
                currentProblemId === null
                  ? 0
                  : problems.findIndex(problem => problem.problem_id === currentProblemId);
              const effectiveUnlockedIdx = unlockedProblemIdx >= 0 ? unlockedProblemIdx : 0;
              const isLocked = idx > effectiveUnlockedIdx;

              if (isLocked) {
                return (
                  <div key={p.problem_id} className="p-4 rounded-xl border-2 border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)]/50 flex items-center gap-3 opacity-60">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-outline-variant)] text-[var(--color-muted)] flex items-center justify-center shrink-0">
                      <LucideLock className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-muted)]">Problem {idx + 1}</h4>
                      <p className="text-[10px] uppercase font-bold text-[var(--color-muted)] tracking-wider">Locked challenge</p>
                    </div>
                  </div>
                );
              }

              if (isActive) {
                return (
                  <div key={p.problem_id} className="p-5 rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] shadow-md transition-all relative overflow-hidden flex flex-col gap-4">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-primary)]"></div>
                    <div className="flex justify-between items-center pl-2">
                      <span className="text-sm font-bold px-3 py-1 rounded-lg bg-brand/20 text-brand">
                        Problem {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{formatRoleLabel(p.recommended_problem_role)}</span>
                    </div>
                    <div className="pl-2">
                      <SafeMarkdown className="text-[15px] md:text-[16px] text-[var(--color-text)] font-medium leading-relaxed whitespace-pre-line">
                        {p.question || ''}
                      </SafeMarkdown>
                    </div>

                    {isCompleted ? (
                      <div className="mt-2 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                        <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5">
                          <LucideCheckCircle2 className="w-5 h-5 shrink-0" /> You completed this problem.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 bg-amber-500/10 p-4 rounded-xl border border-amber-500/30">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="flex-1 bg-[var(--color-surface)] border border-amber-500/30 focus:border-amber-500 rounded-xl p-3 text-[14px] outline-none text-[var(--color-text)] transition-colors shadow-sm"
                              placeholder="Enter your answer here..."
                              value={submitMsg}
                              onChange={e => setSubmitMsg(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && submitMsg.trim() && !isSubmitting) {
                                  handleSendMessage(true, p.unit ? `${submitMsg} ${p.unit}` : submitMsg);
                                }
                              }}
                            />
                            {p.unit && (
                              <span className="text-[var(--color-muted)] font-semibold px-2 shrink-0">{p.unit}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleSendMessage(true, p.unit ? `${submitMsg} ${p.unit}` : submitMsg)}
                            disabled={!submitMsg.trim() || isSubmitting}
                            className="w-full py-2.5 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 flex justify-center items-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95"
                          >
                            <LucideSend className="w-4 h-4" /> {isSubmitting ? 'Submitting...' : 'Submit answer'}
                          </button>
                        </div>
                      </div>
                    )}

                    {(submissionFeedbacks[p.problem_id] || []).length > 0 && (
                      <div className="mt-1 flex flex-col gap-3">
                        <div className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider px-1">Submission history</div>
                        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {(submissionFeedbacks[p.problem_id] || []).map((msg) => {
                            if (msg.sender === 'ai') return null;

                            return (
                              <div key={msg.id} className="p-3.5 rounded-xl text-[14px] leading-relaxed shadow-sm bg-[var(--color-surface-container-high)] text-[var(--color-muted)] border border-[var(--color-outline-variant)]">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-[var(--color-muted)]">
                                    Submitted at {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {msg.isCorrect === true && (
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <LucideCheck className="w-3 h-3" /> Correct
                                    </span>
                                  )}
                                  {msg.isCorrect === false && (
                                    <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-md">
                                      Not correct yet
                                    </span>
                                  )}
                                  {msg.isCorrect === undefined && (
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">
                                      Checking...
                                    </span>
                                  )}
                                </div>
                                <div className="prose prose-sm max-w-none prose-invert font-medium text-[15px]">
                                  <SafeMarkdown>
                                    {msg.text?.replace(/\\\(/g, '$').replace(/\\\)/g, '$').replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$')}
                                  </SafeMarkdown>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (isCompleted) {
                return (
                  <div key={p.problem_id} className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3 transition-all cursor-pointer hover:bg-emerald-500/15" onClick={() => switchActiveProblem(p.problem_id)}>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <LucideCheck className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">Problem {idx + 1}</h4>
                      <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Completed</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.problem_id} className="p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] hover:border-brand/30 cursor-pointer transition-all" onClick={() => switchActiveProblem(p.problem_id)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-outline-variant)] text-[var(--color-muted)]">
                      Problem {idx + 1}
                    </span>
                  </div>
                  <SafeMarkdown className="text-sm text-[var(--color-muted)] line-clamp-2">
                    {p.question || ''}
                  </SafeMarkdown>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-outline-variant)] relative min-w-[320px] h-full overflow-hidden">
          <div className="bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)] px-6 py-4 flex flex-col gap-2 shrink-0 shadow-sm z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!isSidebarOpen && (
                  <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-[var(--color-outline-variant)] hover:bg-[var(--color-outline-variant)] rounded-lg text-[var(--color-muted)] transition-colors">
                    <LucideMenu className="w-5 h-5" />
                  </button>
                )}
                <h3 className="text-lg md:text-xl font-bold text-[var(--color-text)]">Lesson progress</h3>
              </div>
              <span className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap">{problemProgress}% complete</span>
            </div>
            <div className="w-full h-2.5 bg-[var(--color-outline-variant)] rounded-full overflow-hidden border border-[var(--color-outline-variant)] shadow-inner mt-1">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-1000 ease-in-out relative"
                style={{ width: `${problemProgress}%` }}
              >
                <div className="absolute inset-0 bg-[var(--color-surface)]/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[250px] overflow-hidden bg-[var(--color-surface)]">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 bg-[var(--color-surface-container-high)]/10">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                return (
                  <div key={msg.id} className={`flex flex-col max-w-[95%] md:max-w-[85%] ${isAI ? 'self-start' : 'self-end items-end'}`}>
                    {msg.isSubmission && (
                      <div className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded mb-1 self-end">
                        Submitted answer
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm relative group ${isAI ? 'bg-[var(--color-outline-variant)] border border-[var(--color-outline-variant)] text-[var(--color-text)] rounded-tl-sm' : 'bg-brand text-white rounded-tr-sm'}`}>
                      <div className={isAI ? 'prose prose-sm max-w-none prose-invert' : 'prose prose-sm max-w-none prose-invert text-white'}>
                        <SafeMarkdown>
                          {msg.text?.replace(/\\\(/g, '$').replace(/\\\)/g, '$').replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$')}
                        </SafeMarkdown>
                      </div>
                      <span className={`absolute text-[10px] bottom-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${isAI ? '-right-10 text-[var(--color-muted)]' : '-left-10 text-[var(--color-muted)]'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex flex-col max-w-[90%] self-start">
                  <div className="bg-[var(--color-outline-variant)] border border-[var(--color-outline-variant)] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-outline-variant)] shrink-0">
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-sm outline-none text-[var(--color-text)] resize-none transition-colors focus:border-[var(--color-primary)]"
                  placeholder="Ask the AI Tutor for help with the problem..."
                  rows={2}
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(false, inputMsg);
                    }
                  }}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-[var(--color-muted)]">Press Enter to send, Shift+Enter for a new line.</span>
                  <button
                    onClick={() => handleSendMessage(false, inputMsg)}
                    disabled={!inputMsg.trim() || isTyping}
                    className="px-6 py-2 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 bg-brand hover:opacity-90"
                  >
                    Ask Tutor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden lg:flex w-[380px] flex-col bg-[var(--color-surface-container-high)] shrink-0">
          <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] flex items-center justify-between shrink-0">
            <h3 className="font-bold text-[var(--color-text)] text-sm">Scratchpad</h3>
            <span className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">Local only</span>
          </div>
          <div className="flex-1 p-4 flex flex-col min-h-0 bg-[var(--color-surface-container-high)]/30">
            <div className="flex-1 min-h-0 shadow-sm rounded-xl">
              <TiptapEditor content={scratchpadContent} onChange={setScratchpadContent} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">This local scratchpad is not sent to the AI Tutor.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
