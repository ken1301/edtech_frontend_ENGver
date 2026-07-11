import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true, // Required to send/receive HttpOnly Cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Read a cookie by name (client-side only)
 * Used to extract the non-HttpOnly csrf_token cookie
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

// Request interceptor: attach CSRF token header for mutating methods
apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookieValue('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Response interceptor: handle expired authentication only
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && 
          !window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register') &&
          !window.location.pathname.includes('/beta-activate')
      ) {
        window.location.href = '/login?clear_cookie=1';
        return new Promise(() => {}); // Cancel further then/catch handlers
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
