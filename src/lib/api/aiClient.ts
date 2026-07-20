import apiClient from '@/lib/apiClient';

export interface AiTutorLearningStyle {
  cognitive_operation: string[];
  representation: string[];
}

export interface AiTutorStudentPattern {
  cognitive_operation: string[];
  representation: string[];
}

export interface AiTutorPerformance {
  score: number;
  bloom_level: string;
  strengths: string[];
  weaknesses: string[];
  pattern: AiTutorStudentPattern;
}

export interface AiTutorSessionSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  learning_style: AiTutorLearningStyle | null;
  preferred_difficulty: string | null;
  mastering_at: string[];
  struggling_at: string[];
  finished_exercise: Record<string, AiTutorPerformance>;
}

export interface AiTutorErrorResponse {
  status: 'error';
  message: string;
}

export type CloseSessionResponse = AiTutorSessionSummary | AiTutorErrorResponse;

export function isAiTutorErrorResponse(
  response: CloseSessionResponse,
): response is AiTutorErrorResponse {
  return 'status' in response && response.status === 'error';
}

export const aiClient = {
  extractLesson: async (fileData: unknown) => {
    const res = await apiClient.post('/ai-session/extract', fileData);
    return res.data;
  },

  startSession: async (lessonId: string, options?: { reset?: boolean }) => {
    const res = await apiClient.post('/ai-session/start', {
      lessonId,
      reset: options?.reset === true,
    });
    return res.data;
  },

  getActiveSession: async (lessonId: string) => {
    const res = await apiClient.get(`/ai-session/active/${lessonId}`);
    return res.data;
  },

  chat: async (sessionId: string, message: string, is_submission: boolean, problem_id: number) => {
    const res = await apiClient.post('/ai-session/chat', { session_id: sessionId, message, is_submission, problem_id });
    return res.data;
  },

  closeSession: async (sessionId: string, lessonId?: string): Promise<CloseSessionResponse> => {
    const res = await apiClient.post('/ai-session/close', { sessionId, lessonId });
    return res.data;
  }
};
