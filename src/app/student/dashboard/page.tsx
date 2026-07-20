'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RadarChart from '@/components/RadarChart';
import { LucideBookOpen, LucideCalendar, LucideCheck, LucideUser, LucideLoader2, LucidePlus, LucideX } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { trackEvent, EVENTS } from '@/lib/tracking';

type StudentClassSummary = {
  class_id: string;
  progress?: number;
  completed_lessons?: number;
  total_lessons?: number;
};

function calculateOverallLearningProgress(classes: StudentClassSummary[]) {
  const totalLessons = classes.reduce((sum, cls) => sum + Number(cls.total_lessons || 0), 0);
  const completedLessons = classes.reduce((sum, cls) => sum + Number(cls.completed_lessons || 0), 0);

  if (totalLessons > 0) {
    return Math.round((completedLessons / totalLessons) * 100);
  }

  if (classes.length > 0) {
    const progressSum = classes.reduce((sum, cls) => sum + Number(cls.progress || 0), 0);
    return Math.round(progressSum / classes.length);
  }

  return 0;
}

export default function StudentDashboard() {
  const queryClient = useQueryClient();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    trackEvent(EVENTS.APP_OPENED);
  }, []);

  const joinClassMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiClient.post('/student/classes/join', { classCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'classes'] });
      setIsJoinModalOpen(false);
      setClassCode('');
      setJoinError('');
      alert('Joined class successfully.');
    },
    onError: (error: any) => {
      setJoinError(error.response?.data?.message || error.message || 'Something went wrong while joining the class.');
    }
  });

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: metrics } = useQuery({
    queryKey: ['student', 'metrics'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/metrics');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: classesData } = useQuery({
    queryKey: ['student', 'classes'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/classes');
      return res.data?.classes || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ['student', 'assignments'],
    queryFn: async () => {
      const res = await apiClient.get('/student/me/assignments');
      return res.data?.assignments || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const learningProgress = React.useMemo(
    () => calculateOverallLearningProgress(classes),
    [classes],
  );

  if (loadingUser) {
    return (
      <div className="space-y-[var(--spacing-gutter)] animate-pulse">
        <div className="mb-[var(--spacing-margin-desktop)] flex justify-between items-end">
          <div>
            <div className="h-10 w-64 bg-slate-200 rounded-lg mb-2"></div>
            <div className="h-5 w-48 bg-slate-200 rounded-lg"></div>
          </div>
        </div>

        <section className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border border-[var(--color-outline-variant)] p-6 h-[300px] flex gap-6">
          <div className="w-1/3 flex flex-col justify-center space-y-4">
            <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
          </div>
          <div className="w-2/3 bg-slate-100 rounded-xl h-full"></div>
        </section>
      </div>
    );
  }

  const thinking = metrics?.thinking_score || 0;
  const skill = metrics?.skill_score || 0;
  const result = metrics?.result_score || 0;
  const avgQuizScore = result || 0;
  const radarData = [thinking, skill, result];

  const CalendarModal = ({ isOpen, onClose, assignments }: { isOpen: boolean, onClose: () => void, assignments: any[] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    if (!isOpen) return null;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative m-4">
          <div className="flex justify-between items-center p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)]">
            <div className="flex items-center gap-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">{'<'}</button>
              <h3 className="text-xl font-bold text-[var(--color-text)] min-w-[150px] text-center">{monthNames[month]} {year}</h3>
              <button onClick={handleNextMonth} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">{'>'}</button>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <LucideX className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 bg-[var(--color-surface-container-high)]">
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-[var(--color-outline-variant)] rounded-xl overflow-hidden">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="bg-[var(--color-surface)] p-2 text-center text-xs font-bold text-[var(--color-on-surface-variant)]">
                  {d}
                </div>
              ))}
              {days.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="bg-[var(--color-surface-container-high)] min-h-[100px]" />;

                const dayAssignments = assignments.filter((a: any) => {
                  const aDate = new Date(a.due_date);
                  return aDate.getDate() === d && aDate.getMonth() === month && aDate.getFullYear() === year;
                });

                const today = new Date();
                const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

                return (
                  <div key={i} className={`bg-[var(--color-surface)] min-h-[100px] p-2 flex flex-col ${isToday ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}>
                    <span className={`text-sm font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-on-surface-variant)]'}`}>
                      {d}
                    </span>
                    <div className="flex-1 space-y-1 overflow-y-auto">
                      {dayAssignments.map((a: any, idx: number) => (
                        <Link href={`/student/lesson/${a.assignment_id}/part1`} key={idx} className="block text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded px-1.5 py-1 truncate hover:bg-rose-100 transition-colors" title={a.title}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1"></span>
                          {a.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-[var(--spacing-gutter)]">
      <div className="mb-[var(--spacing-margin-desktop)] flex justify-between items-end">
        <div>
          <h2 className="text-[36px] leading-[44px] tracking-[-0.02em] font-bold text-[var(--color-text)] mb-1 capitalize">
            Welcome back, {user?.full_name?.split(' ')[0] || user?.username || 'Student'}
          </h2>
          <p className="text-lg text-[var(--color-on-surface-variant)]">Here is a quick overview of your current learning progress.</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Current term</p>
          <p className="text-sm font-medium text-[var(--color-primary)]">
            {(() => {
              const date = new Date();
              const month = date.getMonth() + 1;
              const year = date.getFullYear();
              return month >= 8 ? `Term 1, ${year}` : `Term 2, ${year}`;
            })()}
          </p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-2xl)] p-8 text-center shadow-sm mb-[var(--spacing-margin-desktop)] flex flex-col items-center justify-center gap-3">
          <div className="text-3xl">!</div>
          <h3 className="text-lg font-bold text-amber-900">No class enrollment yet</h3>
          <p className="text-sm text-amber-700 max-w-md">
            You are not enrolled in any class yet. Enter a class code below to join, unlock your roadmap, and view your learning analytics.
          </p>
        </div>
      ) : (
        <section className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border border-[var(--color-outline-variant)] p-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)] mb-[var(--spacing-margin-desktop)]">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <h3 className="text-[20px] font-semibold text-[var(--color-text)] mb-2">Capability Snapshot</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
                A quick view of your core learning signals. Keep interacting consistently to improve and balance your academic profile.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text)]">Overall progress</span>
                  <span className="text-sm font-medium text-emerald-600">{learningProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${learningProgress}%` }}></div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-medium text-[var(--color-text)]">Average quiz score</span>
                  <span className="text-sm font-medium text-[var(--color-primary)]">{avgQuizScore}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${avgQuizScore}%` }}></div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3 h-[250px] flex justify-center items-center">
              <RadarChart
                labels={['Mathematical thinking', 'Calculation skills', 'Problem solving']}
                datasets={[{
                  label: 'Capability score',
                  data: radarData,
                  backgroundColor: 'rgba(70, 72, 212, 0.2)',
                  borderColor: '#4648d4',
                  pointBackgroundColor: '#4648d4',
                  pointBorderColor: '#fff',
                  borderWidth: 2,
                }]}
              />
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-margin-desktop)]">
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[var(--color-text)]">Enrolled classes</h3>
            <div className="flex gap-4 items-center">
              <button onClick={() => setIsJoinModalOpen(true)} className="flex items-center gap-2 text-sm font-medium bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                <LucidePlus className="w-4 h-4" /> Join class
              </button>
              <Link href="/student/classes" className="text-sm font-medium text-[var(--color-primary)] hover:underline">View all</Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 py-12 text-center bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] border-dashed rounded-[var(--radius-2xl)]">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LucideBookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-semibold text-[var(--color-text)] mb-2">You have not joined any class yet</h4>
                <p className="text-[var(--color-muted)] mb-6 max-w-sm mx-auto">Use a class code shared by your teacher to enroll and start your guided learning flow.</p>
                <button onClick={() => setIsJoinModalOpen(true)} className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white font-medium px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  Enter class code
                </button>
              </div>
            ) : (
              classes.map((cls: any, i: number) => {
                const colors = [
                  { bg: 'bg-[var(--color-primary)]', light: 'bg-indigo-50', text: 'text-[var(--color-primary)]', hover: 'hover:bg-indigo-700' },
                  { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', hover: 'hover:bg-emerald-700' },
                  { bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-700', hover: 'hover:bg-rose-700' },
                ];
                const theme = colors[i % colors.length];
                const moduleProgress = Number(cls.progress || 0);

                return (
                  <div key={cls.class_id} className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border border-[var(--color-outline-variant)] p-4 shadow-[0_4px_10px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-px transition-all flex flex-col h-full relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-1 h-full ${theme.bg}`}></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`inline-block px-2 py-1 ${theme.light} ${theme.text} rounded-full text-xs font-medium mb-2`}>
                          Class
                        </span>
                        <h4 className="text-[20px] font-semibold text-[var(--color-text)] leading-tight mb-1">{cls.class_name}</h4>
                        <p className="text-sm text-[var(--color-on-surface-variant)] flex items-center gap-1">
                          <LucideUser className="w-4 h-4" /> {cls.teacher_name || 'Teacher'}
                        </p>
                      </div>
                      <div className={`w-10 h-10 rounded-full ${theme.light} flex items-center justify-center ${theme.text}`}>
                        <LucideBookOpen className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-[var(--color-outline-variant)]">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-[var(--color-on-surface-variant)]">Module progress</span>
                        <span className="text-xs font-medium text-[var(--color-text)]">{moduleProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${moduleProgress}%` }}></div>
                      </div>
                      <Link href={`/student/roadmap?class=${cls.class_id}`} className={`block text-center w-full ${theme.bg} text-white ${theme.hover} rounded-lg py-2 text-sm font-medium transition-colors`}>
                        Open roadmap
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="hidden lg:col-span-1">
          <h3 className="text-[20px] font-semibold text-[var(--color-text)] mb-4">Action items</h3>
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] border border-[var(--color-outline-variant)] p-4 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-outline-variant)]">
              <span className="text-sm font-medium text-[var(--color-on-surface-variant)]">Upcoming</span>
              <span className="inline-flex items-center justify-center px-2 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium">{classes.length === 0 ? 0 : assignments.length} pending</span>
            </div>

            <ul className="space-y-3">
              {classes.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)] text-center py-8 bg-[var(--color-surface-container-high)] rounded-lg border border-[var(--color-outline-variant)]">No tasks to process yet</li>
              ) : assignments.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)] text-center py-8 bg-[var(--color-surface-container-high)] rounded-lg border border-[var(--color-outline-variant)]">No pending assignments</li>
              ) : (
                assignments.map((task: any, i: number) => {
                  const dueDate = new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <Link href={`/student/lesson/${task.assignment_id}/part1`} key={i} className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-container-high)] rounded-lg transition-colors group cursor-pointer block">
                      <div className="mt-0.5 w-5 h-5 rounded border border-slate-300 flex items-center justify-center group-hover:border-[var(--color-primary)] transition-colors">
                        <LucideCheck className="w-3 h-3 text-transparent group-hover:text-[var(--color-primary)] transition-colors" strokeWidth={3} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{task.title}</p>
                        <p className="text-xs text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                          <LucideCalendar className="w-3 h-3" /> Due: {dueDate}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </ul>

            <button onClick={() => setIsCalendarModalOpen(true)} className="w-full mt-6 bg-indigo-50 hover:bg-indigo-100 text-[var(--color-primary)] rounded-lg py-2 text-sm font-medium transition-colors">
              Open calendar
            </button>
          </div>
        </section>
      </div>

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="flex justify-between items-center p-6 border-b border-[var(--color-outline-variant)]">
              <h3 className="text-xl font-bold text-[var(--color-text)]">Join a class</h3>
              <button
                onClick={() => { setIsJoinModalOpen(false); setJoinError(''); setClassCode(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <LucideX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-[var(--color-muted)] mb-4">
                Enter the 6-character class code shared by your teacher to join the class.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="classCode" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Class code</label>
                  <input
                    id="classCode"
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="EX: A8K9MN"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-[var(--color-text)] font-mono text-lg uppercase focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>
                {joinError && <p className="text-sm text-rose-600 font-medium">{joinError}</p>}
                <button
                  onClick={() => joinClassMutation.mutate(classCode)}
                  disabled={classCode.length < 5 || joinClassMutation.isPending}
                  className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm mt-4"
                >
                  {joinClassMutation.isPending ? <LucideLoader2 className="w-5 h-5 animate-spin" /> : 'Join now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CalendarModal isOpen={isCalendarModalOpen} onClose={() => setIsCalendarModalOpen(false)} assignments={assignments} />
    </div>
  );
}
