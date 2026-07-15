type ApiErrorResponse = {
  response?: {
    data?: {
      message?: unknown;
      error?: unknown;
    };
  };
  message?: string;
};

const translateKnownMessage = (message: string): string => {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('password') &&
    (normalized.includes('6') || normalized.includes('ký tự') || normalized.includes('ky tu'))
  ) {
    return 'Password must be at least 6 characters.';
  }

  return message;
};

const normalizeMessage = (message: unknown): string | null => {
  if (typeof message === 'string' && message.trim()) {
    return translateKnownMessage(message);
  }

  if (Array.isArray(message)) {
    const parts = message
      .map((item) => (typeof item === 'string' ? translateKnownMessage(item.trim()) : ''))
      .filter(Boolean);
    return parts.length ? parts.join('\n') : null;
  }

  return null;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const typedError = error as ApiErrorResponse;
    const responseMessage = normalizeMessage(typedError.response?.data?.message);
    if (responseMessage) {
      return responseMessage;
    }

    const responseError = normalizeMessage(typedError.response?.data?.error);
    if (responseError) {
      return responseError;
    }

    if (typedError.message && !typedError.message.startsWith('Request failed')) {
      return typedError.message;
    }
  }

  return fallback;
}
