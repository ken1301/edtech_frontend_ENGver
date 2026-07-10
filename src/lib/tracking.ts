import posthog from 'posthog-js';

// Event Names
export const EVENTS = {
  APP_OPENED: 'app_opened',
  LESSON_STARTED: 'lesson_started',
  LESSON_CONTENT_COMPLETED: 'lesson_content_completed',
  LESSON_QUIZ_STARTED: 'lesson_quiz_started',
  LESSON_SCROLL_DEPTH: 'lesson_scroll_depth',
  LESSON_PART2_EXITED: 'lesson_part2_exited',
  LESSON_PART2_CRAFT_INTERACTED: 'lesson_part2_craft_interacted',
  LESSON_PART2_PROGRESS: 'lesson_part2_progress',
};

// Generic track function
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties);
  }
};
