'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LucideBell,
  LucideBookOpen,
  LucideCheckCircle,
  LucideChevronRight,
  LucideClipboardList,
  LucideFilter,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMoreHorizontal,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from 'lucide-react';
import RadarChart from '@/components/RadarChart';
import apiClient from '@/lib/apiClient';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-[var(--color-outline-variant)] ${className}`} />
);

type DashboardNotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  lessonId?: string;
};

type TeacherRoadmapItem = {
  id: string;
  lessonId?: string;
  title?: string;
  description?: string;
  questionsCount?: number;
  completedCount?: number;
};

type TeacherResourceItem = {
  id: string;
  title?: string;
  description?: string;
};

type TeacherExerciseItem = {
  id: string;
  title?: string;
};

type TeacherSubmissionItem = {
  id: string;
  student_id: string;
  student_name: string;
  submitted_at: string;
  status?: string;
  grade?: number | null;
  feedback?: string | null;
  content?: string | null;
  file_url?: string | null;
};

type TeacherStudentItem = {
  student_id: string;
  full_name?: string | null;
};

type TeacherClassItem = {
  class_id: string;
  class_name: string;
  description?: string | null;
  class_code?: string | null;
  student_count?: number | null;
};

type TeacherStudentMetrics = {
  studentName?: string;
  thinking_score?: number;
  skill_score?: number;
  result_score?: number;
  attendance?: number;
  engagement?: number;
  average_score?: number;
  overall_progress?: number;
};

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const NOTIFICATION_STORAGE_KEY = 'eduflow.notifications';
const NOTIFICATION_EVENT_NAME = 'eduflow-notification';

const getInitials = (name?: string, fallbackId?: string) => {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return fallbackId ? fallbackId.slice(0, 2).toUpperCase() : 'ST';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const typedError = error as ApiErrorLike;
    if (typeof typedError.response?.data?.message === 'string') return typedError.response.data.message;
    if (typeof typedError.message === 'string') return typedError.message;
  }
  return fallback;
};

const RoadmapView = ({ classId }: { classId: string | null }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<TeacherRoadmapItem[]>({
    queryKey: ['teacher', 'classes', classId, 'roadmap'],
    queryFn: async () => {
      const res = await apiClient.get(`/student/classes/${classId}/roadmap`);
      return res.data || [];
    },
    enabled: !!classId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const res = await apiClient.delete(`/teacher/classes/${classId}/exercises/${exerciseId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'classes', classId, 'roadmap'] });
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!data || data.length === 0) return <div className="py-8 text-center text-[var(--color-muted)]">No lessons have been assigned to this class yet.</div>;

  return (
    <div className="space-y-4">
      {data.map((item, idx) => (
        <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-bold text-[var(--color-primary)]">
              {idx + 1}
            </div>
            <div>
              <h4 className="text-lg font-bold text-[var(--color-text)]">{item.title || 'Untitled lesson'}</h4>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {item.questionsCount || 0} questions • <span className="font-medium text-emerald-600">Completed: {item.completedCount || 0} students</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.lessonId && (
              <Link
                href={`/teacher/copilot/${item.lessonId}?classId=${classId || ''}`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                title="View AI Copilot report"
              >
                <LucideBookOpen className="h-4 w-4" /> Copilot
              </Link>
            )}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this lesson?')) deleteMutation.mutate(item.id);
              }}
              disabled={deleteMutation.isPending}
              className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-rose-50 hover:text-rose-500"
              title="Delete lesson"
            >
              <LucideTrash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const ResourcesView = ({ classId }: { classId: string | null }) => {
  const { data, isLoading } = useQuery<TeacherRoadmapItem[]>({
    queryKey: ['teacher', 'classes', classId, 'roadmap'],
    queryFn: async () => {
      const res = await apiClient.get(`/student/classes/${classId}/roadmap`);
      return res.data || [];
    },
    enabled: !!classId,
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  const resources = (data || []).filter((resource): resource is TeacherResourceItem => Boolean(resource.description && resource.description.startsWith('http')));
  if (resources.length === 0) return <div className="py-8 text-center text-[var(--color-muted)]">No resources have been uploaded yet from lesson links.</div>;

  return (
    <div className="space-y-4">
      {resources.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-3">
            <LucideBookOpen className="h-6 w-6 text-emerald-500" />
            <div>
              <h4 className="font-bold text-[var(--color-text)]">{item.title || 'Attached resource'}</h4>
              <a href={item.description} target="_blank" className="text-sm text-brand hover:underline">
                {item.description}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const GradingView = ({
  classId,
  selectedExerciseId,
  setSelectedExerciseId,
  selectedSubmissionId,
  setSelectedSubmissionId,
}: {
  classId: string | null;
  selectedExerciseId: string | null;
  setSelectedExerciseId: (id: string | null) => void;
  selectedSubmissionId: string | null;
  setSelectedSubmissionId: (id: string | null) => void;
}) => {
  const { data: exercises, isLoading: loadingExercises } = useQuery<TeacherExerciseItem[]>({
    queryKey: ['teacher', 'classes', classId, 'roadmap'],
    queryFn: async () => {
      const res = await apiClient.get(`/student/classes/${classId}/roadmap`);
      return res.data || [];
    },
    enabled: !!classId,
  });

  const activeExerciseId = selectedExerciseId || exercises?.[0]?.id || null;

  const { data: submissions, isLoading: loadingSubmissions } = useQuery<TeacherSubmissionItem[]>({
    queryKey: ['teacher', 'classes', classId, 'exercises', activeExerciseId, 'submissions'],
    queryFn: async () => {
      const res = await apiClient.get(`/teacher/classes/${classId}/exercises/${activeExerciseId}/submissions`);
      return res.data || [];
    },
    enabled: !!classId && !!activeExerciseId,
  });

  if (loadingExercises) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!exercises || exercises.length === 0) return <div className="py-8 text-center text-[var(--color-muted)]">No exercises have been assigned to this class yet.</div>;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Choose exercise / lesson</label>
        <select
          value={selectedExerciseId || ''}
          onChange={(e) => {
            setSelectedExerciseId(e.target.value || null);
            setSelectedSubmissionId(null);
          }}
          className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.title}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-[var(--color-outline-variant)] pt-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Submission list</h4>
        {loadingSubmissions ? (
          <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : !submissions || submissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted)]">No students have submitted this exercise yet.</div>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => {
              const isSelected = selectedSubmissionId === submission.id;
              const isGraded = submission.status === 'GRADED';
              return (
                <div
                  key={submission.id}
                  onClick={() => setSelectedSubmissionId(submission.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-md ring-1 ring-[var(--color-primary)]'
                      : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-high)] hover:shadow-sm'
                  }`}
                >
                  <div>
                    <h5 className="text-sm font-semibold text-[var(--color-text)]">{submission.student_name}</h5>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Submitted at: {new Date(submission.submitted_at).toLocaleString('en-US')}</p>
                  </div>
                  {isGraded ? (
                    <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{submission.grade} pts</span>
                  ) : (
                    <span className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Ungraded</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const GradingFormPanel = ({
  submissionId,
  classId,
  exerciseId,
  onClose,
}: {
  submissionId: string;
  classId: string;
  exerciseId: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const gradeRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  const { data: submissions } = useQuery<TeacherSubmissionItem[]>({
    queryKey: ['teacher', 'classes', classId, 'exercises', exerciseId, 'submissions'],
    enabled: !!classId && !!exerciseId,
  });

  const submission = submissions?.find((item) => item.id === submissionId);

  const gradeMutation = useMutation({
    mutationFn: async ({ gradeVal, feedbackVal }: { gradeVal: number; feedbackVal: string }) => {
      const res = await apiClient.post(`/teacher/submissions/${submissionId}/grade`, {
        grade: gradeVal,
        feedback: feedbackVal,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'classes', classId, 'exercises', exerciseId, 'submissions'] });
      if (submission) {
        queryClient.invalidateQueries({ queryKey: ['teacher', 'classes', classId, 'students', submission.student_id, 'metrics'] });
      }
      alert('Grading saved successfully!');
    },
    onError: (error: unknown) => {
      alert(getErrorMessage(error, 'Error while saving the grade'));
    },
  });

  if (!submission) return <div className="p-8 text-center text-[var(--color-muted)]">Loading submission details...</div>;

  const handleSave = () => {
    const gradeValue = gradeRef.current?.value || '';
    const feedbackValue = feedbackRef.current?.value || '';
    const gradeNum = parseFloat(gradeValue);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
      alert('The score must be a number between 0 and 10');
      return;
    }
    gradeMutation.mutate({ gradeVal: gradeNum, feedbackVal: feedbackValue });
  };

  return (
    <div className="relative z-10 -mt-12 px-8 pb-8">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-[var(--color-surface)] bg-brand/10 text-4xl font-bold text-[var(--color-primary)] shadow-sm">
          {getInitials(submission.student_name)}
        </div>
        <div className="mt-14">
          <button onClick={onClose} className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition-colors hover:bg-[var(--color-surface-container-high)]">
            Close
          </button>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[var(--color-text)]">{submission.student_name}</h2>
      <p className="mb-6 text-sm text-[var(--color-muted)]">Essay exercise submission</p>

      <div className="mb-6 space-y-4">
        {submission.content && (
          <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Submission content</h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">{submission.content}</p>
          </div>
        )}

        {submission.file_url && (
          <div className="flex items-center justify-between rounded-2xl border border-brand/30/50 bg-brand/10 p-4">
            <div className="flex items-center gap-3">
              <LucideClipboardList className="h-6 w-6 text-brand" />
              <div>
                <h5 className="text-sm font-semibold text-[var(--color-text)]">Attachment</h5>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">Document uploaded by the student</p>
              </div>
            </div>
            <a
              href={submission.file_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)] shadow-sm transition-colors hover:bg-[var(--color-surface-container-high)]"
            >
              View file
            </a>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-6 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--color-text)]">Grading and feedback</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Score (out of 10) *</label>
            <input
              ref={gradeRef}
              type="number"
              step="0.1"
              min="0"
              max="10"
              defaultValue={submission.grade !== undefined && submission.grade !== null ? submission.grade.toString() : ''}
              className="w-full rounded-xl border border-[var(--color-outline-variant)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Enter a value from 0.0 to 10.0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Teacher feedback</label>
            <textarea
              ref={feedbackRef}
              rows={4}
              defaultValue={submission.feedback || ''}
              className="w-full resize-none rounded-xl border border-[var(--color-outline-variant)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Enter feedback or revision guidance..."
            />
          </div>
          <button
            onClick={handleSave}
            disabled={gradeMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          >
            {gradeMutation.isPending ? 'Saving...' : 'Save score and feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'student-list' | 'learning-paths' | 'resources' | 'grading'>('student-list');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<DashboardNotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [addStudentsInput, setAddStudentsInput] = useState('');
  const [addStudentsResult, setAddStudentsResult] = useState<{ message: string; added: string[]; skipped: string[]; notFound: string[] } | null>(null);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const classId = params.get('classId');
      const tab = params.get('tab');
      if (classId) setSelectedClassId(classId);
      if (tab) setActiveTab(tab as typeof activeTab);
      if (classId || tab) window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  const addStudentsMutation = useMutation({
    mutationFn: async ({ classId, usernames }: { classId: string; usernames: string[] }) => {
      const res = await apiClient.post('/teacher/classes/add-students', { classId, usernames });
      return res.data;
    },
    onSuccess: (data) => {
      setAddStudentsResult(data);
      setAddStudentsInput('');
      queryClient.invalidateQueries({ queryKey: ['teacher', 'classes', selectedClassId, 'students'] });
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async ({ className, description }: { className: string; description: string }) => {
      const res = await apiClient.post('/teacher/classes', { className, description });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'classes'] });
      setShowCreateClassModal(false);
      setNewClassName('');
      setNewClassDescription('');
      alert('Class created successfully!');
    },
    onError: (error: unknown) => {
      alert(getErrorMessage(error, 'Error while creating the class'));
    },
  });

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: classesData, isLoading: loadingClasses } = useQuery<TeacherClassItem[]>({
    queryKey: ['teacher', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/teacher/classes');
      return res.data?.classes || [];
    },
    staleTime: 1000 * 5,
    refetchInterval: 5000,
  });

  const classes = useMemo(() => (Array.isArray(classesData) ? classesData : []), [classesData]);

  const { data: studentsData, isLoading: loadingStudents } = useQuery<TeacherStudentItem[]>({
    queryKey: ['teacher', 'classes', selectedClassId, 'students'],
    queryFn: async () => {
      const res = await apiClient.get(`/teacher/classes/${selectedClassId}/students`);
      return res.data?.students || [];
    },
    enabled: !!selectedClassId,
    staleTime: 1000 * 5,
    refetchInterval: 5000,
  });

  const students = useMemo(() => (Array.isArray(studentsData) ? studentsData : []), [studentsData]);
  const activeStudentId = selectedStudentId || students[0]?.student_id || null;
  const activeExerciseId = selectedExerciseId || null;

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.full_name && student.full_name.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [students, searchQuery],
  );

  const { data: studentMetrics, isLoading: loadingMetrics } = useQuery<TeacherStudentMetrics>({
    queryKey: ['teacher', 'classes', selectedClassId, 'students', activeStudentId, 'metrics'],
    queryFn: async () => {
      const res = await apiClient.get(`/teacher/classes/${selectedClassId}/students/${activeStudentId}/metrics`);
      return res.data;
    },
    enabled: !!selectedClassId && !!activeStudentId,
    staleTime: 1000 * 60 * 2,
  });

  const currentClass = useMemo(() => classes.find((item) => item.class_id === selectedClassId) || null, [classes, selectedClassId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as DashboardNotificationItem[]) : [];
      setNotifications(stored);
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    }

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<DashboardNotificationItem>;
      if (!customEvent.detail) return;
      setNotifications((prev) => [customEvent.detail, ...prev.filter((item) => item.id !== customEvent.detail.id)].slice(0, 10));
    };

    window.addEventListener(NOTIFICATION_EVENT_NAME, handleNotification as EventListener);
    return () => window.removeEventListener(NOTIFICATION_EVENT_NAME, handleNotification as EventListener);
  }, []);

  const radarLabels = ['Thinking', 'Skills', 'Results', 'Attendance', 'Engagement', 'Avg score'];
  const radarDatasets = [
    {
      label: studentMetrics?.studentName || 'Student',
      data: [
        studentMetrics?.thinking_score ?? 0,
        studentMetrics?.skill_score ?? 0,
        studentMetrics?.result_score ?? 0,
        studentMetrics?.attendance ?? 0,
        studentMetrics?.engagement ?? 0,
        studentMetrics?.average_score ?? 0,
      ],
      backgroundColor: 'rgba(70, 72, 212, 0.2)',
      borderColor: '#4648d4',
      pointBackgroundColor: '#4648d4',
      pointBorderColor: '#fff',
      borderWidth: 2,
    },
  ];

  const handleAddStudents = () => {
    if (!selectedClassId || !addStudentsInput.trim()) return;
    const usernames = addStudentsInput.split(/[,\n]+/).map((u) => u.trim()).filter(Boolean);
    addStudentsMutation.mutate({ classId: selectedClassId, usernames });
  };

  const openReport = (lessonId?: string) => {
    if (!lessonId) return;
    setShowNotifications(false);
    router.push(`/teacher/copilot/${lessonId}`);
  };

  return (
    <div className="app-shell-accent flex h-screen flex-col bg-bg">
      <nav className="elevated-panel sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-semibold">
            <span className="text-[var(--color-primary)]">D</span>
            <span className="text-white">-Friend</span>
          </span>
          <div className="hidden items-center gap-2 rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-4 py-2 md:flex">
            <LucideSearch className="h-4 w-4 text-[var(--color-muted)]" />
            <input
              className="w-64 bg-transparent p-0 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
              placeholder="Search students..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              aria-label="Notifications"
              className="relative rounded-full p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-container-high)]"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <LucideBell className="h-5 w-5" />
              {notifications.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.18)]" />}
            </button>
            {showNotifications && (
              <div className="fixed right-6 top-16 z-[2147483647] w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] shadow-2xl">
                <div className="border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-4">
                  <h3 className="font-bold text-[var(--color-text)]">Notifications</h3>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[var(--color-muted)]">No new notifications</div>
                ) : (
                  <div className="max-h-[calc(100vh-5rem)] divide-y divide-[var(--color-outline-variant)] overflow-y-auto">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => openReport(notification.lessonId)}
                        className="w-full p-4 text-left transition-colors hover:bg-[var(--color-surface-container-high)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{notification.title}</p>
                            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--color-muted)]">{notification.message}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                              {notification.type.replace(/_/g, ' ')}
                            </span>
                            {notification.lessonId && <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">View report</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-3">
                  <Link href="/teacher/copilot" className="block w-full text-center text-xs font-semibold text-[var(--color-primary)] hover:underline">
                    View all reports
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-outline-variant)] bg-brand/10 text-sm font-bold text-[var(--color-primary)]">
            {getInitials(user?.full_name || user?.username, 'T')}
          </div>
        </div>
      </nav>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="elevated-panel hidden h-full w-[280px] flex-shrink-0 rounded-none border-b-0 border-l-0 border-t-0 py-6 md:flex md:flex-col">
          <div className="mb-8 px-6">
            <Link
              href="/teacher/lesson/create"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-3 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
            >
              <LucidePlus className="h-5 w-5" />
              Create lesson
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-4">
            <div className="mb-4">
              <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Main menu</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => {
                      setSelectedClassId(null);
                      setSelectedStudentId(null);
                      setSelectedExerciseId(null);
                      setSelectedSubmissionId(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition-all ${
                      selectedClassId === null
                        ? 'border-[var(--color-primary)] bg-brand/10 text-[var(--color-primary)]'
                        : 'border-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    <LucideLayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </button>
                </li>
                <li>
                  <Link
                    href="/teacher/copilot"
                    className="flex w-full items-center gap-3 rounded-lg border-l-4 border-transparent px-4 py-3 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)]"
                  >
                    <LucideBookOpen className="h-5 w-5" />
                    Teacher Copilot
                    <span className="ml-auto flex h-5 items-center rounded-full bg-brand/10 px-2 text-[10px] font-bold text-[var(--color-primary)]">AI</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between px-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Active classes</h3>
                <button
                  onClick={() => setShowCreateClassModal(true)}
                  className="flex items-center gap-0.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <LucidePlus className="h-3 w-3" /> Create
                </button>
              </div>
              <ul className="space-y-2">
                {loadingClasses ? (
                  [1, 2].map((i) => (
                    <li key={i} className="px-4">
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </li>
                  ))
                ) : classes.length === 0 ? (
                  <li className="mx-4 rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-4 py-6 text-center">
                    <p className="mb-3 text-sm text-[var(--color-muted)]">No classes yet.</p>
                    <button
                      onClick={() => setShowCreateClassModal(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:opacity-90"
                    >
                      <LucidePlus className="h-3.5 w-3.5" /> Create class
                    </button>
                  </li>
                ) : (
                  classes.map((teacherClass) => (
                    <li key={teacherClass.class_id}>
                      <button
                        onClick={() => {
                          setSelectedClassId(teacherClass.class_id);
                          setSelectedStudentId(null);
                          setSelectedExerciseId(null);
                          setSelectedSubmissionId(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                          selectedClassId === teacherClass.class_id
                            ? 'border-brand/30 bg-[var(--color-surface-container-high)]'
                            : 'border-transparent hover:bg-[var(--color-surface-container-high)]'
                        }`}
                      >
                        <div>
                          <span className={`block text-sm font-medium ${selectedClassId === teacherClass.class_id ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
                            {teacherClass.class_name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{teacherClass.description || 'No description'}</span>
                        </div>
                        {selectedClassId === teacherClass.class_id && <LucideChevronRight className="h-5 w-5 text-[var(--color-primary)]" />}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </nav>

          <div className="mx-4 mt-auto border-t border-[var(--color-outline-variant)] px-4 pt-4">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[var(--color-muted)] transition-all hover:bg-[var(--color-surface-container-high)]">
              <LucideLogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="relative flex flex-1 overflow-hidden bg-[var(--color-surface-container-high)]/60">
          {selectedClassId === null ? (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text)]">Class list</h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Manage classes, students, and review learning paths.</p>
                  </div>
                  <button
                    onClick={() => setShowCreateClassModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
                  >
                    <LucidePlus className="h-5 w-5" /> Create a new class
                  </button>
                </div>

                {loadingClasses ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-[var(--color-outline-variant)]" />)}</div>
                ) : classes.length === 0 ? (
                  <div className="elevated-panel flex flex-col items-center justify-center gap-4 rounded-3xl py-20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-[var(--color-primary)]">
                      <LucideBookOpen className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text)]">No classes yet</h3>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">Start by creating your first class.</p>
                    </div>
                    <button onClick={() => setShowCreateClassModal(true)} className="mt-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90">
                      Create class now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((teacherClass, idx) => {
                      const colors = [
                        { border: 'border-t-brand' },
                        { border: 'border-t-emerald-500' },
                        { border: 'border-t-rose-500' },
                      ];
                      const theme = colors[idx % colors.length];

                      return (
                        <div key={teacherClass.class_id} className={`elevated-panel flex h-full flex-col rounded-2xl border-t-4 p-6 transition-all duration-300 hover:-translate-y-0.5 ${theme.border}`}>
                          <h3 className="mb-2 truncate text-xl font-bold text-[var(--color-text)]">{teacherClass.class_name}</h3>
                          <p className="mb-2 min-h-[40px] line-clamp-2 text-sm text-[var(--color-muted)]">{teacherClass.description || 'No description for this class'}</p>
                          <div className="mb-4 flex items-center gap-1.5 self-start rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3 py-1.5 text-xs text-[var(--color-muted)]">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Class size: <strong className="text-[var(--color-text)]">{teacherClass.student_count || 0}</strong> students</span>
                          </div>
                          <div className="mt-auto flex items-center justify-between border-t border-[var(--color-outline-variant)] pt-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Class code</span>
                              <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{teacherClass.class_code}</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedClassId(teacherClass.class_id);
                                setSelectedStudentId(null);
                                setSelectedExerciseId(null);
                                setSelectedSubmissionId(null);
                              }}
                              className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition-colors"
                            >
                              Open class
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => setShowCreateClassModal(true)}
                      className="group flex min-h-[176px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-6 text-center transition-all hover:border-[var(--color-primary)]"
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-muted)] transition-colors group-hover:bg-brand/10 group-hover:text-[var(--color-primary)]">
                        <LucidePlus className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-primary)]">Create a new class</span>
                      <span className="mt-1 text-xs text-[var(--color-muted)]">Add a new learning space</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <section className="flex min-w-[350px] flex-1 flex-col overflow-y-auto border-r border-[var(--color-outline-variant)]">
                <header className="sticky top-0 z-20 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-6 py-6">
                  <button
                    onClick={() => {
                      setSelectedClassId(null);
                      setSelectedStudentId(null);
                      setSelectedExerciseId(null);
                      setSelectedSubmissionId(null);
                    }}
                    className="mb-4 flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    ← Back to class list
                  </button>
                  <div className="mb-6 flex items-end justify-between">
                    <div>
                      <span className="mb-2 inline-block rounded-md bg-brand/10 px-2 py-1 text-xs font-semibold text-[var(--color-primary)]">Selected class</span>
                      {loadingClasses ? (
                        <Skeleton className="mb-1 h-9 w-48" />
                      ) : classes.length === 0 ? (
                        <h1 className="text-3xl font-bold text-[var(--color-text)]">Create a new class</h1>
                      ) : (
                        <h1 className="text-3xl font-bold text-[var(--color-text)]">{currentClass?.class_name || 'Choose a class'}</h1>
                      )}
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {classes.length === 0 ? 'Start by creating your first class to manage students and lessons.' : currentClass?.description || 'No description for this class'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {classes.length === 0 ? (
                        <button
                          onClick={() => setShowCreateClassModal(true)}
                          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
                        >
                          <LucidePlus className="h-5 w-5" /> Create class
                        </button>
                      ) : (
                        <>
                          {currentClass?.class_code && (
                            <div className="flex flex-col items-end">
                              <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Class code</span>
                              <div
                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3 py-1.5 transition-colors hover:bg-[var(--color-outline-variant)]"
                                onClick={() => {
                                  const classCode = `${currentClass.class_code ?? ''}`;
                                  navigator.clipboard.writeText(classCode);
                                  alert('Copied class code: ' + classCode);
                                }}
                              >
                                <span className="font-mono text-lg font-bold tracking-widest text-[var(--color-primary)]">{currentClass.class_code}</span>
                                <LucideClipboardList className="h-4 w-4 text-[var(--color-muted)]" />
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 self-end">
                            <button
                              onClick={() => {
                                setShowAddStudentsModal(true);
                                setAddStudentsResult(null);
                              }}
                              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
                            >
                              <LucidePlus className="h-4 w-4" /> Add students
                            </button>
                            <button className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-container-high)]">
                              <LucideFilter className="h-5 w-5" />
                            </button>
                            <button className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-container-high)]">
                              <LucideMoreHorizontal className="h-5 w-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-8 border-b border-[var(--color-outline-variant)]">
                    {(['student-list', 'learning-paths', 'resources', 'grading'] as const).map((tab) => {
                      const labels = {
                        'student-list': `Student list (${students.length})`,
                        'learning-paths': 'Learning path',
                        resources: 'Resources',
                        grading: 'Grading',
                      };
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                            activeTab === tab ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-muted)]'
                          }`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>
                </header>

                <div className="space-y-3 p-6">
                  {activeTab === 'student-list' &&
                    (loadingStudents ? (
                      <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="mb-4 text-[var(--color-muted)]">No students yet.</p>
                        {selectedClassId && (
                          <button
                            onClick={() => {
                              setShowAddStudentsModal(true);
                              setAddStudentsResult(null);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                          >
                            <LucidePlus className="h-4 w-4" /> Add students
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const isActive = selectedStudentId === student.student_id;
                        const initials = getInitials(student.full_name || undefined, student.student_id);
                        const colors = [
                          { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
                          { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
                          { bg: 'bg-brand/10', text: 'text-[var(--color-primary)]', border: 'border-brand/30' },
                        ];
                        const theme = colors[index % colors.length];

                        return (
                          <div
                            key={student.student_id}
                            onClick={() => setSelectedStudentId(student.student_id)}
                            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                              isActive
                                ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-md ring-1 ring-[var(--color-primary)]'
                                : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-high)] hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full border font-bold ${theme.bg} ${theme.text} ${theme.border}`}>{initials}</div>
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[var(--color-surface)] bg-emerald-500" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-[var(--color-text)]">{student.full_name || `Student ${student.student_id}`}</h4>
                                <p className="mt-0.5 text-xs text-[var(--color-muted)]">ID: {student.student_id}</p>
                              </div>
                            </div>
                            <LucideChevronRight className="h-5 w-5 text-[var(--color-muted)]" />
                          </div>
                        );
                      })
                    ))}

                  {activeTab === 'learning-paths' && <RoadmapView classId={selectedClassId} />}
                  {activeTab === 'resources' && <ResourcesView classId={selectedClassId} />}
                  {activeTab === 'grading' && (
                    <GradingView
                      classId={selectedClassId}
                      selectedExerciseId={activeExerciseId}
                      setSelectedExerciseId={setSelectedExerciseId}
                      selectedSubmissionId={selectedSubmissionId}
                      setSelectedSubmissionId={setSelectedSubmissionId}
                    />
                  )}
                </div>
              </section>

              {activeTab === 'grading' ? (
                selectedSubmissionId && selectedClassId && activeExerciseId ? (
                  <aside className="relative z-10 hidden w-[400px] flex-shrink-0 overflow-y-auto border-l border-[var(--color-outline-variant)] bg-[var(--color-surface)] shadow-[-4px_0_24px_rgba(0,0,0,0.02)] lg:block xl:w-[480px]">
                    <div className="relative h-32 w-full overflow-hidden bg-brand/10">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4648d4 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
                    </div>
                    <GradingFormPanel
                      submissionId={selectedSubmissionId}
                      classId={selectedClassId}
                      exerciseId={activeExerciseId}
                      onClose={() => setSelectedSubmissionId(null)}
                    />
                  </aside>
                ) : (
                  <aside className="hidden w-[400px] flex-shrink-0 items-center justify-center border-l border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)] lg:flex xl:w-[480px]">
                    <p>Select a submission to start grading.</p>
                  </aside>
                )
              ) : activeStudentId ? (
                <aside className="relative z-10 hidden w-[400px] flex-shrink-0 overflow-y-auto border-l border-[var(--color-outline-variant)] bg-[var(--color-surface)] shadow-[-4px_0_24px_rgba(0,0,0,0.02)] lg:block xl:w-[480px]">
                  <div className="relative h-32 w-full overflow-hidden bg-brand/10">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4648d4 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
                  </div>

                  {loadingMetrics ? (
                    <div className="relative z-10 -mt-12 space-y-4 px-8 pb-8">
                      <Skeleton className="h-24 w-24 rounded-2xl" />
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-32 rounded-2xl" />
                        <Skeleton className="h-32 rounded-2xl" />
                      </div>
                      <Skeleton className="h-64 rounded-2xl" />
                    </div>
                  ) : (
                    <div className="relative z-10 -mt-12 px-8 pb-8">
                      <div className="mb-6 flex items-start justify-between">
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-[var(--color-surface)] bg-emerald-100 text-4xl font-bold text-[var(--color-primary)] shadow-sm">
                          {getInitials(studentMetrics?.studentName, activeStudentId)}
                        </div>
                        <div className="mt-14 flex gap-2">
                          <button className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-muted)] shadow-sm transition-colors hover:bg-[var(--color-surface-container-high)]">
                            Message
                          </button>
                        </div>
                      </div>

                      <h2 className="text-3xl font-bold text-[var(--color-text)]">{studentMetrics?.studentName || `Student ${activeStudentId}`}</h2>
                      <p className="mb-6 text-sm text-[var(--color-muted)]">Student ID: #{activeStudentId}</p>

                      <div className="mb-6 grid grid-cols-2 gap-4">
                        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 shadow-sm">
                          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-50 opacity-50" />
                          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Current progress</span>
                          <span className="block text-4xl font-bold text-emerald-600">{studentMetrics?.overall_progress || 0}%</span>
                          <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--color-surface-container-high)]">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${studentMetrics?.overall_progress || 0}%` }} />
                          </div>
                          <span className="mt-1.5 block text-right text-xs font-medium text-[var(--color-muted)]">Average score: {studentMetrics?.average_score || 0}%</span>
                        </div>
                        <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 shadow-sm">
                          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Attendance</span>
                          <span className="block text-4xl font-bold text-[var(--color-text)]">{studentMetrics?.attendance ?? 0}%</span>
                          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
                            <LucideCheckCircle className="h-4 w-4 text-emerald-500" />
                            Based on system reports
                          </p>
                        </div>
                      </div>

                      <div className="mb-6 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                            <span className="inline-block h-6 w-2 rounded-full bg-[var(--color-primary)]" />
                            Performance analysis
                          </h3>
                        </div>
                        <div className="relative flex h-64 w-full justify-center">
                          <RadarChart labels={radarLabels} datasets={radarDatasets} showLegend={true} />
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Recent activity</h3>
                        <div className="rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] p-4 text-sm text-[var(--color-muted)]">
                          This feature is still under development. Data will be integrated from the tracking system soon.
                        </div>
                      </div>
                    </div>
                  )}
                </aside>
              ) : (
                <aside className="elevated-panel hidden w-[400px] flex-shrink-0 items-center justify-center rounded-none border-b-0 border-r-0 border-t-0 p-8 text-center text-[var(--color-muted)] lg:flex xl:w-[480px]">
                  <p>Select a student to view details.</p>
                </aside>
              )}
            </>
          )}
        </main>
      </div>

      {showAddStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="elevated-panel-strong mx-4 w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Add students to class</h3>
              <button onClick={() => { setShowAddStudentsModal(false); setAddStudentsResult(null); }} className="text-[var(--color-muted)] hover:text-[var(--color-muted)]">x</button>
            </div>

            {!addStudentsResult ? (
              <>
                <p className="mb-3 text-sm text-[var(--color-muted)]">
                  Enter the students' <strong>usernames</strong> separated by commas or line breaks:
                </p>
                <textarea
                  className="w-full resize-none rounded-xl border border-[var(--color-outline-variant)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20"
                  rows={4}
                  placeholder="student1, student2, student3&#10;or one username per line"
                  value={addStudentsInput}
                  onChange={(e) => setAddStudentsInput(e.target.value)}
                />
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setShowAddStudentsModal(false)} className="flex-1 rounded-xl border border-[var(--color-outline-variant)] py-2 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-container-high)]">
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStudents}
                    disabled={addStudentsMutation.isPending || !addStudentsInput.trim()}
                    className="flex-1 rounded-xl bg-[var(--color-primary)] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {addStudentsMutation.isPending ? 'Adding...' : 'Add students'}
                  </button>
                </div>
                {addStudentsMutation.isError && <p className="mt-2 text-xs text-red-500">Something went wrong. Please try again.</p>}
              </>
            ) : (
              <>
                <div className="mb-4 space-y-3">
                  {addStudentsResult.added.length > 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="mb-1 text-sm font-semibold text-emerald-700">✓ Added successfully ({addStudentsResult.added.length})</p>
                      <p className="text-xs text-emerald-600">{addStudentsResult.added.join(', ')}</p>
                    </div>
                  )}
                  {addStudentsResult.skipped.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-1 text-sm font-semibold text-amber-700">⚠ Already in class ({addStudentsResult.skipped.length})</p>
                      <p className="text-xs text-amber-600">{addStudentsResult.skipped.join(', ')}</p>
                    </div>
                  )}
                  {addStudentsResult.notFound.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="mb-1 text-sm font-semibold text-red-700">✗ Not found ({addStudentsResult.notFound.length})</p>
                      <p className="text-xs text-red-600">{addStudentsResult.notFound.join(', ')}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setShowAddStudentsModal(false); setAddStudentsResult(null); }}
                  className="w-full rounded-xl bg-[var(--color-primary)] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="elevated-panel-strong mx-4 w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Create a new class</h3>
              <button onClick={() => { setShowCreateClassModal(false); setNewClassName(''); setNewClassDescription(''); }} className="text-[var(--color-muted)] hover:text-[var(--color-muted)]">x</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Class name *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[var(--color-outline-variant)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Example: Math 10A1"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-muted)]">Class description</label>
                <textarea
                  className="w-full resize-none rounded-xl border border-[var(--color-outline-variant)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-brand/20"
                  rows={3}
                  placeholder="Enter a short description for the class..."
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { setShowCreateClassModal(false); setNewClassName(''); setNewClassDescription(''); }}
                  className="flex-1 rounded-xl border border-[var(--color-outline-variant)] py-2.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-container-high)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newClassName.trim()) return;
                    createClassMutation.mutate({ className: newClassName, description: newClassDescription });
                  }}
                  disabled={createClassMutation.isPending || !newClassName.trim()}
                  className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {createClassMutation.isPending ? 'Creating...' : 'Create class'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
