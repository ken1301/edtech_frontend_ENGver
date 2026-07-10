// ========================================
// Shared Types based on NestJS Backend DTOs
// ========================================

export type UploadStep = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

export interface QuestionOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: string;
  question_text: string;
  options: QuestionOption[];
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

export interface UploadExerciseResponse {
  exercise_id: string;
  title: string;
  questions: Question[];
}

// ========================================
// Part 2 Types (Deep AI Analysis)
// ========================================

export interface ApproachPattern {
  cognitive_operation: string[]; 
  representation: string[]; 
  constraints: string[]; 
}

export interface Approach {
  summary: string;
  bloom_level: string; 
  concept_type_used: string[]; 
  pattern: ApproachPattern;
  approach_answer: string;
  strengths: string[];
  optimal_complexity: string[]; 
  weaknesses: string[];
  high_time_complexity: string[]; 
  max_attempts: number;
}

export interface ComplexProblem {
  problem_id: number;
  question: string;
  attachment_url: string[];
  approach_list: Approach[];
  final_answer: string;
  unit?: string;
  open_approach: boolean;
  recommended_problem_role: string; 
  max_approach_trial: number;
}
