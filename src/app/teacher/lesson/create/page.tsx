'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LucideBookOpen,
  LucideSettings,
  LucideChevronLeft,
  LucideCheckCircle2,
  LucideBrainCircuit
} from 'lucide-react';
import { ComplexProblem } from '@/lib/types/exercise.types';
import apiClient from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import 'katex/dist/katex.min.css';
import {
  ConceptChoice,
  conceptsForTopic,
  DEFAULT_CONCEPT,
  DEFAULT_SUBJECT,
  DEFAULT_TOPIC,
  normalizeCurriculumSelection,
  SubjectChoice,
  SUBJECT_CHOICES,
  TopicChoice,
  topicsForSubject,
  translateSubject,
  translateTopic,
  translateConcept,
} from '@/lib/curriculum';

type DraftExerciseRecord = {
  _id?: string;
  exercise_id?: string;
  lesson_id?: string;
  title?: string;
  lessonGoal?: string;
  deadline?: string;
  classId?: string | null;
  targetClassIds?: string[];
  publishedClassIds?: string[];
  exercise?: {
    lesson1_knowledge?: Lesson1Knowledge | null;
    extracted_questions?: Lesson1Question[];
    problem_list?: ComplexProblem[];
    lesson1_summary?: {
      text?: string;
      core_skills?: string[];
      ready_for_problem_1?: boolean;
    } | null;
    lesson2_summary?: string | null;
    subject?: string;
    topic?: string;
    concept?: string;
  };
};

type Lesson1Question = {
  question?: string;
  question_text?: string;
  options?: Array<string | { label: string; text: string }>;
  answer?: string;
  correct_answer?: string;
  explanation?: string;
};

type TeacherClassRecord = {
  class_id: string;
  class_name: string;
  class_code?: string;
};

type Lesson1Summary = {
  text?: string;
  core_skills?: string[];
  ready_for_problem_1?: boolean;
};

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

type Lesson1StageResponse = {
  draftExerciseId: string;
  lessonId: string;
  lesson1ExerciseId: string;
  output?: {
    knowledge?: Lesson1Knowledge;
    exercises?: Lesson1Question[];
    summary?: Lesson1Summary;
  };
};

type Lesson2StageResponse = {
  draftExerciseId: string;
  lessonId: string;
  lesson2ExerciseId: string;
  output?: {
    summary?: string;
    exercise?: {
      problem_list?: ComplexProblem[];
    };
    problem_list?: ComplexProblem[];
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createClientLessonId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lesson-${Date.now()}`;
};

const createLessonRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 0,
  withCredentials: true,
  headers: { 'Content-Type': 'multipart/form-data' },
} as const;

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toUtcIsoFromDateTimeLocal = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const hydrateDraftExercise = (
  record: DraftExerciseRecord,
  handlers: {
    setPart1Questions: (value: Lesson1Question[]) => void;
    setLesson1Knowledge: (value: Lesson1Knowledge | null) => void;
    setPart2Problems: (value: ComplexProblem[]) => void;
    setLesson1Summary: (value: Lesson1Summary | null) => void;
    setLesson2Summary: (value: string) => void;
    setSelectedClassIds: (value: string[]) => void;
    setFormData: React.Dispatch<React.SetStateAction<{
      title: string;
      subject: SubjectChoice;
      topic: TopicChoice;
      concept: ConceptChoice;
      lessonGoal: string;
      deadline: string;
    }>>;
    setDeadline: (value: string) => void;
  },
) => {
  const exerciseData = record.exercise || {};
  if (exerciseData.extracted_questions) {
    handlers.setPart1Questions(exerciseData.extracted_questions);
  }
  handlers.setLesson1Knowledge(exerciseData.lesson1_knowledge || null);
  if (exerciseData.problem_list) {
    handlers.setPart2Problems(exerciseData.problem_list);
  }
  handlers.setLesson1Summary(exerciseData.lesson1_summary || null);
  handlers.setLesson2Summary(exerciseData.lesson2_summary || '');
  const restoredClassIds = Array.isArray(record.targetClassIds)
    ? record.targetClassIds
    : Array.isArray(record.publishedClassIds)
    ? record.publishedClassIds
    : record.classId
      ? [record.classId]
      : [];
  handlers.setSelectedClassIds(restoredClassIds);

  const lessonMetadata = normalizeCurriculumSelection({
    subject: exerciseData.subject,
    topic: exerciseData.topic,
    concept: exerciseData.concept,
  });
  handlers.setFormData({
    title: record.title || '',
    ...lessonMetadata,
    lessonGoal: record.lessonGoal || '',
    deadline: toDateTimeLocalValue(record.deadline),
  });
  handlers.setDeadline(toDateTimeLocalValue(record.deadline));
};

function CreateLessonWizard() {
  const defaultLessonMetadata = {
    subject: DEFAULT_SUBJECT,
    topic: DEFAULT_TOPIC,
    concept: DEFAULT_CONCEPT,
  };
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { num: 1, title: 'General information', icon: LucideBookOpen },
    { num: 2, title: 'Gen with AI', icon: LucideBrainCircuit },
    { num: 3, title: 'Review & Public', icon: LucideSettings },
  ];

  const searchParams = useSearchParams();

  // Global State for Lesson
  const [formData, setFormData] = useState(() => {
    const metadata = normalizeCurriculumSelection({
      subject: searchParams.get('subject') || undefined,
      topic: searchParams.get('topic') || undefined,
      concept: searchParams.get('concept') || undefined,
    });
    return {
      title: '',
      ...defaultLessonMetadata,
      ...metadata,
      lessonGoal: searchParams.get('lessonGoal') || '',
      deadline: '',
    };
  });

  const availableTopics = topicsForSubject(formData.subject);
  const availableConcepts = conceptsForTopic(formData.topic);

  const [part1Questions, setPart1Questions] = useState<Lesson1Question[]>([]);
  const [lesson1Knowledge, setLesson1Knowledge] = useState<Lesson1Knowledge | null>(null);
  const [part2Problems, setPart2Problems] = useState<ComplexProblem[]>([]);
  const [lesson1Summary, setLesson1Summary] = useState<Lesson1Summary | null>(null);
  const [lesson2Summary, setLesson2Summary] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [generatedExerciseId, setGeneratedExerciseId] = useState<string>('');
  const [activeGenerationStep, setActiveGenerationStep] = useState<'lesson1' | 'lesson2' | null>(null);
  const [activeRecoveryMessage, setActiveRecoveryMessage] = useState<string>('');
  const [currentLessonId, setCurrentLessonId] = useState<string>('');

  const { data: classesData } = useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/teacher/classes');
      return (res.data?.classes || []) as TeacherClassRecord[];
    }
  });
  const classes: TeacherClassRecord[] = Array.isArray(classesData) ? classesData : [];

  const isExtracting = activeGenerationStep !== null;

  const loadDraftExercise = async (draftId: string) => {
    const exerciseRes = await apiClient.get('/exercises');
    const allExercises = exerciseRes.data?.data || [];
    const myEx = allExercises.find((e: DraftExerciseRecord) => e._id === draftId || e.exercise_id === draftId);
    if (myEx) {
      hydrateDraftExercise(myEx, {
        setPart1Questions,
        setLesson1Knowledge,
        setPart2Problems,
        setLesson1Summary,
        setLesson2Summary,
        setSelectedClassIds,
        setFormData,
        setDeadline,
      });
      setCurrentStep((myEx.exercise?.problem_list?.length || 0) > 0 ? 3 : 2);
    }
    return myEx;
  };

  const loadDraftExerciseByLessonId = async (lessonId: string) => {
    const exerciseRes = await apiClient.get('/exercises');
    const allExercises = exerciseRes.data?.data || [];
    const myEx = allExercises.find((e: DraftExerciseRecord) => e.lesson_id === lessonId);
    if (myEx) {
      const resolvedDraftId = myEx._id || myEx.exercise_id || '';
      if (resolvedDraftId) {
        setGeneratedExerciseId(resolvedDraftId);
      }
      hydrateDraftExercise(myEx, {
        setPart1Questions,
        setLesson1Knowledge,
        setPart2Problems,
        setLesson1Summary,
        setLesson2Summary,
        setSelectedClassIds,
        setFormData,
        setDeadline,
      });
      setCurrentStep((myEx.exercise?.problem_list?.length || 0) > 0 ? 3 : 2);
    }
    return myEx;
  };

  const tryRecoverLesson1Draft = async (lessonId: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const recoveredDraft = await loadDraftExerciseByLessonId(lessonId);
      const hasRecoveredLesson1 = Boolean(
        recoveredDraft?.exercise?.extracted_questions?.length || recoveredDraft?.exercise?.lesson1_summary,
      );

      if (hasRecoveredLesson1) {
        return recoveredDraft;
      }

      if (attempt < 3) {
        await sleep(1500);
      }
    }

    return null;
  };

  const tryRecoverLesson2Draft = async (draftId: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const recoveredDraft = await loadDraftExercise(draftId);
      const hasRecoveredLesson2 = Boolean(
        recoveredDraft?.exercise?.problem_list?.length || recoveredDraft?.exercise?.lesson2_summary,
      );

      if (hasRecoveredLesson2) {
        return recoveredDraft;
      }

      if (attempt < 3) {
        await sleep(1500);
      }
    }

    return null;
  };

  useEffect(() => {
    const restoreDraft = async () => {
      const draftId = localStorage.getItem('draftExerciseId');
      if (!draftId) {
        return;
      }

      if (!window.confirm('You have a lesson draft in progress. Do you want to restore it?')) {
        localStorage.removeItem('draftExerciseId');
        return;
      }

      await Promise.resolve();
      setGeneratedExerciseId(draftId);
      loadDraftExercise(draftId).catch(err => console.error(err));
    };

    void restoreDraft();
  }, []);

  useEffect(() => {
    if (generatedExerciseId) {
      localStorage.setItem('draftExerciseId', generatedExerciseId);
    }
  }, [generatedExerciseId]);

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubjectChange = (subject: string) => {
    const nextSubject = subject as SubjectChoice;
    const nextTopics = topicsForSubject(nextSubject);
    const nextTopic = nextTopics[0] || DEFAULT_TOPIC;
    const nextConcepts = conceptsForTopic(nextTopic);
    const nextConcept = nextConcepts[0] || DEFAULT_CONCEPT;
    setFormData((current) => ({
      ...current,
      subject: nextSubject,
      topic: nextTopic,
      concept: nextConcept,
    }));
  };

  const handleTopicChange = (topic: string) => {
    const nextTopic = topic as TopicChoice;
    const nextConcepts = conceptsForTopic(nextTopic);
    const nextConcept = nextConcepts[0] || DEFAULT_CONCEPT;
    setFormData((current) => ({
      ...current,
      topic: nextTopic,
      concept: nextConcept,
    }));
  };

  const handleConceptChange = (concept: string) => {
    setFormData((current) => ({
      ...current,
      concept: concept as ConceptChoice,
    }));
  };

  const handleGenerateWithAI = async () => {
    const lessonId = currentLessonId || createClientLessonId();
    setCurrentLessonId(lessonId);
    setCurrentStep(2);
    setActiveRecoveryMessage('');
    let generationPhase: 'lesson1' | 'lesson2' = 'lesson1';
    let resolvedDraftId = '';

    try {
      setActiveGenerationStep('lesson1');
      const lesson1FormData = new FormData();
      lesson1FormData.append('title', formData.title);
      lesson1FormData.append('subject', formData.subject);
      lesson1FormData.append('topic', formData.topic);
      lesson1FormData.append('concept', formData.concept);
      lesson1FormData.append('lessonGoal', formData.lessonGoal);
      lesson1FormData.append('classIds', JSON.stringify(selectedClassIds));
      lesson1FormData.append('lessonId', lessonId);

      const lesson1Response = await apiClient.post<Lesson1StageResponse>(
        '/exercises/create-lesson/lesson1',
        lesson1FormData,
        createLessonRequestConfig,
      );

      resolvedDraftId = lesson1Response.data.draftExerciseId;
      setGeneratedExerciseId(resolvedDraftId);
      setCurrentLessonId(lesson1Response.data.lessonId || lessonId);
      setLesson1Knowledge(lesson1Response.data.output?.knowledge || null);
      setPart1Questions(lesson1Response.data.output?.exercises || []);
      setLesson1Summary(lesson1Response.data.output?.summary || null);
      setActiveRecoveryMessage('');

      generationPhase = 'lesson2';
      setActiveGenerationStep('lesson2');
      const lesson2DraftId = resolvedDraftId;
      if (!lesson2DraftId) {
        alert('A draft lesson has not been created yet, so Lesson 2 cannot be generated.');
        return;
      }

      const lesson2FormData = new FormData();
      lesson2FormData.append('draftExerciseId', lesson2DraftId);
      lesson2FormData.append('classIds', JSON.stringify(selectedClassIds));

      const lesson2Response = await apiClient.post<Lesson2StageResponse>(
        '/exercises/create-lesson/lesson2',
        lesson2FormData,
        createLessonRequestConfig,
      );

      setPart2Problems(
        lesson2Response.data.output?.exercise?.problem_list || lesson2Response.data.output?.problem_list || [],
      );
      setLesson2Summary(lesson2Response.data.output?.summary || '');
      setActiveRecoveryMessage('');
      setCurrentStep(3);
    } catch (err) {
      console.error(err);

      if (generationPhase === 'lesson1') {
        setActiveRecoveryMessage('AI is trying a fallback model for Lesson 1. Checking the saved draft lesson...');
        const recoveredDraft = await tryRecoverLesson1Draft(lessonId);
        if (!recoveredDraft) {
          setActiveRecoveryMessage('');
          alert('An error occurred while generating Lesson 1.');
          return;
        }

        setActiveRecoveryMessage('');
        return;
      }

      if (generationPhase === 'lesson2') {
        setActiveRecoveryMessage('AI is trying a fallback model for Lesson 2. Checking the saved draft lesson...');
        const recoveredDraft = await tryRecoverLesson2Draft(resolvedDraftId || generatedExerciseId);
        if (recoveredDraft) {
          setActiveRecoveryMessage('');
          setCurrentStep(3);
          return;
        }

        setActiveRecoveryMessage('');
        alert('An error occurred while generating Lesson 2.');
      }
    } finally {
      setActiveGenerationStep(null);
    }
  };

  // Renderers for Steps
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-2xl font-bold text-[var(--color-text)]">1. General information</h2>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-muted)] mb-2">Lesson title</label>
          <input
            type="text"
            className="w-full border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
            placeholder="Example: Linear equations"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)] mb-2">Lesson goal</label>
            <textarea
              className="w-full border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none min-h-[80px]"
              placeholder="Example: Students can solve one-variable linear equations."
              maxLength={1000}
              value={formData.lessonGoal}
              onChange={e => {
                const value = e.target.value;
                setFormData({ ...formData, lessonGoal: value });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)] mb-2">Completion deadline (defaults to publish date + 7 days)</label>
            <input
              type="datetime-local"
              className="w-full border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
              value={deadline}
              onChange={e => {
                const value = e.target.value;
                setDeadline(value);
                setFormData({ ...formData, deadline: value });
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)] mb-2">Subject</label>
            <select
              className="w-full border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={formData.subject}
              onChange={e => handleSubjectChange(e.target.value)}
            >
              {SUBJECT_CHOICES.map(subject => (
                <option key={subject} value={subject}>
                  {translateSubject(subject)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)] mb-2">Topic</label>
            <select
              className="w-full border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={formData.topic}
              onChange={e => handleTopicChange(e.target.value)}
            >
              {availableTopics.map(topic => (
                <option key={topic} value={topic}>
                  {translateTopic(topic)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-muted)] mb-2">Concept</label>
            <select
              className="w-full border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={formData.concept}
              onChange={e => handleConceptChange(e.target.value)}
            >
              {availableConcepts.map(concept => (
                <option key={concept} value={concept}>
                  {translateConcept(concept)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-[var(--color-muted)]">Target classes for this learning path</label>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              {selectedClassIds.length} classes selected
            </span>
          </div>
          <p className="mb-4 text-sm text-[var(--color-muted)]">The selected classes will be used to fetch `previous_lessons` for Lesson 1 and will remain attached through publishing.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {classes.map((cls) => {
              const isSelected = selectedClassIds.includes(cls.class_id);
              return (
                <button
                  key={cls.class_id}
                  type="button"
                  onClick={() => {
                    setSelectedClassIds((current) =>
                      current.includes(cls.class_id)
                        ? current.filter((value) => value !== cls.class_id)
                        : [...current, cls.class_id],
                    );
                  }}
                  className={`rounded-2xl border p-4 text-left transition-colors ${isSelected ? 'border-[var(--color-primary)] bg-brand/10 shadow-sm' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-container-high)]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--color-text)]">{cls.class_name}</div>
                      <div className="mt-1 text-xs text-[var(--color-muted)]">{cls.class_code || cls.class_id}</div>
                    </div>
                    <div className={`mt-1 h-5 w-5 rounded border ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)]'}`}>
                      {isSelected && <LucideCheckCircle2 className="h-5 w-5 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">2. Gen with AI</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">AI will generate Lesson 1 and Lesson 2 from the initial form. No extra teacher action is needed at this step.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
          <LucideBrainCircuit className="h-4 w-4" />
          Auto flow
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Lesson 1',
            desc: 'Generate foundational knowledge and questions',
            active: activeGenerationStep === 'lesson1',
            done: Boolean(part1Questions.length || lesson1Summary?.text || lesson1Knowledge),
          },
          {
            title: 'Lesson 2',
            desc: 'Expand into deeper problem-solving',
            active: activeGenerationStep === 'lesson2',
            done: Boolean(part2Problems.length || lesson2Summary),
          },
          {
            title: 'Review',
            desc: 'Teacher only reviews before publishing',
            active: false,
            done: currentStep === 3,
          },
        ].map((item) => (
          <div key={item.title} className={`rounded-2xl border p-4 ${item.active ? 'border-[var(--color-primary)] bg-brand/10' : item.done ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)]'}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--color-text)]">{item.title}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${item.active ? 'bg-[var(--color-primary)] text-white' : item.done ? 'bg-emerald-500 text-white' : 'bg-[var(--color-surface-container-high)] text-[var(--color-muted)]'}`}>
                {item.active ? 'Running' : item.done ? 'Done' : 'Waiting'}
              </span>
            </div>
            <p className="text-sm leading-6 text-[var(--color-muted)]">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text)]">Generating lesson automatically</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Part 1 and Part 2 will be generated automatically from the provided data, then moved to the publishing step.</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-4 py-3 text-sm text-[var(--color-text)]">
            {activeGenerationStep === 'lesson1' && 'AI is generating Lesson 1...'}
            {activeGenerationStep === 'lesson2' && 'AI is generating Lesson 2...'}
            {!activeGenerationStep && (part2Problems.length > 0 ? 'Content is ready for review.' : 'AI generation has not started yet.')}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Stable input</span>
            <p className="text-sm leading-6 text-[var(--color-text)]">The lesson title, goal, subject, topic, concept, target classes, and deadline remain consistent throughout the AI flow.</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Status</span>
            <p className="text-sm leading-6 text-[var(--color-text)]">The teacher only needs to wait for Part 1 and Part 2 to finish generating, then move to final review.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <h2 className="text-2xl font-bold text-[var(--color-text)]">3. Review &amp; Public</h2>
      <p className="text-sm text-[var(--color-muted)] mb-6">Review the summaries for both parts, confirm the publishing classes, and publish when everything looks right.</p>

      <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-6 border border-[var(--color-outline-variant)] space-y-4">
        <div>
          <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold block mb-1">Lesson title</span>
          <p className="font-semibold text-[var(--color-text)] text-lg">{formData.title || 'Untitled lesson'}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
           <div>
              <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold block mb-1">Subject</span>
              <p className="font-medium text-[var(--color-text)] capitalize">{formData.subject}</p>
           </div>
           <div>
              <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold block mb-1">Topic</span>
              <p className="font-medium text-[var(--color-text)] capitalize">{formData.topic}</p>
           </div>
           <div>
              <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold block mb-1">Stats</span>
              <p className="font-medium text-emerald-400">{part1Questions.length} questions, {part2Problems.length} problems</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-5 shadow-sm">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Summary Lesson 1</span>
          <p className="text-sm leading-6 text-[var(--color-text)]">{lesson1Summary?.text || 'No summary available for Lesson 1 yet.'}</p>
          {lesson1Summary?.core_skills && lesson1Summary.core_skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {lesson1Summary.core_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-5 shadow-sm">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Summary Lesson 2</span>
          <p className="text-sm leading-6 text-[var(--color-text)]">{lesson2Summary || 'No summary available for Lesson 2 yet.'}</p>
          <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {lesson1Summary?.ready_for_problem_1 ? 'Ready to publish' : 'Needs review before publishing'}
          </div>
        </div>
      </div>

      <div className="mt-6 pb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-[var(--color-muted)]">Choose classes for publishing</label>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            {selectedClassIds.length} classes selected
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {classes.map((cls) => {
            const isSelected = selectedClassIds.includes(cls.class_id);
            return (
              <button
                key={cls.class_id}
                type="button"
                onClick={() => {
                  setSelectedClassIds((current) =>
                    current.includes(cls.class_id)
                      ? current.filter((value) => value !== cls.class_id)
                      : [...current, cls.class_id],
                  );
                }}
                className={`rounded-2xl border p-4 text-left transition-colors ${isSelected ? 'border-[var(--color-primary)] bg-brand/10 shadow-sm' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-container-high)]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--color-text)]">{cls.class_name}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted)]">{cls.class_code || cls.class_id}</div>
                  </div>
                  <div className={`mt-1 h-5 w-5 rounded border ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface)]'}`}>
                    {isSelected && <LucideCheckCircle2 className="h-5 w-5 text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {classes.length === 0 && (
          <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-4 py-3 text-sm text-[var(--color-muted)]">
            There are no classes available to publish this lesson to.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full overflow-y-auto bg-bg py-10 px-6 pb-24 relative">
      {/* Top Progress Bar */}
      <div className="mx-auto w-full max-w-5xl bg-[var(--color-surface)] pt-8 pb-6 rounded-3xl shadow-sm border border-[var(--color-outline-variant)] mb-8 relative overflow-hidden">
        {/* Connecting Lines */}
        <div className="absolute top-[55px] left-[10%] right-[10%] h-1 bg-[var(--color-surface-container-high)] z-0"></div>
        <div className="absolute top-[55px] left-[10%] h-1 bg-[var(--color-primary)] z-0 transition-all duration-500" style={{ width: `${((currentStep - 1) / 2) * 80}%` }}></div>

        <div className="flex justify-between items-start relative z-10 w-full px-8">
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            const isPast = currentStep > step.num;
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-4 transition-colors duration-300 ${isActive ? 'border-[var(--color-surface)] bg-[var(--color-primary)] text-white ring-4 ring-brand/20' : isPast ? 'border-[var(--color-surface)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-surface)] bg-[var(--color-surface-container-high)] text-[var(--color-muted)]'}`}>
                  {isPast ? <LucideCheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-semibold mt-3 text-center px-1 ${isActive || isPast ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Form Content */}
      <div className="mx-auto w-full max-w-5xl bg-[var(--color-surface)] p-10 rounded-3xl shadow-sm border border-[var(--color-outline-variant)] mb-8 min-h-[500px]">
        {activeRecoveryMessage && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {activeRecoveryMessage}
          </div>
        )}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Bottom Nav */}
      <div className="mx-auto w-full max-w-5xl flex justify-between mt-4">
        <button
          onClick={prevStep}
          disabled={currentStep === 1 || isExtracting}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors ${currentStep === 1 ? 'opacity-0 cursor-default' : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] disabled:opacity-50'}`}
        >
          <LucideChevronLeft className="w-5 h-5" /> Back
        </button>

        {currentStep === 1 ? (
          <button
            onClick={handleGenerateWithAI}
            disabled={isExtracting}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand via-[var(--color-primary)] to-accent px-8 py-3 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LucideBrainCircuit className={`w-5 h-5 ${activeGenerationStep ? 'animate-pulse' : ''}`} />
            {isExtracting ? 'Generating...' : 'Generate with AI'}
          </button>
        ) : currentStep === 2 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-muted)]">
            <LucideBrainCircuit className="h-4 w-4 text-[var(--color-primary)]" />
            AI will move automatically to the review step when finished
          </div>
        ) : (
          <button
            onClick={async () => {
              try {
                if (!generatedExerciseId) {
                  alert('There is no draft lesson available to publish.');
                  return;
                }
                if (selectedClassIds.length === 0) {
                  alert('Please select at least one class before publishing the lesson.');
                  return;
                }

                await apiClient.patch(`/exercises/${generatedExerciseId}`, {
                  classIds: selectedClassIds,
                  deadline: toUtcIsoFromDateTimeLocal(deadline),
                });

                localStorage.removeItem('draftExerciseId');
                alert('Lesson published successfully!');
                window.location.href = '/teacher/dashboard';
              } catch (e) {
                console.error(e);
                alert('An error occurred while publishing the lesson.');
              }
            }}
            className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg cursor-pointer"
          >
            <LucideCheckCircle2 className="w-6 h-6" /> Publish lesson
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreateLessonPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-[var(--color-muted)]">Loading...</div>}>
      <CreateLessonWizard />
    </React.Suspense>
  );
}
