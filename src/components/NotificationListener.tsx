'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import apiClient from '@/lib/apiClient';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: string;
  lessonId?: string;
  path?: string;
}

interface TokenResponse {
  token?: string;
}

interface NotificationPayload {
  title?: string;
  message?: string;
  type?: string;
  lessonId?: string;
  path?: string;
}

interface StoredNotification extends Toast {
  createdAt: string;
}

const AUTH_ERROR_MESSAGES = ['jwt', 'auth', 'token', 'unauthorized', 'forbidden'];
const NOTIFICATION_STORAGE_KEY = 'eduflow.notifications';
const NOTIFICATION_EVENT_NAME = 'eduflow-notification';

function resolveSocketBackendUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (candidate.startsWith('/')) {
        continue;
      }

      return new URL(candidate).origin;
    } catch {
      continue;
    }
  }

  return 'http://localhost:3002';
}

function persistNotification(notification: StoredNotification) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as StoredNotification[]) : [];
    const next = [notification, ...existing].slice(0, 10);
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent<StoredNotification>(NOTIFICATION_EVENT_NAME, { detail: notification }));
  } catch (error) {
    console.warn('Failed to persist notification:', error);
  }
}

export default function NotificationListener() {
  const pathname = usePathname();
  const openNotificationTarget = (payload: { lessonId?: string; path?: string }) => {
    if (payload.path) {
      window.location.href = payload.path;
      return;
    }
    if (!payload.lessonId) return;
    window.location.href = `/teacher/copilot/${payload.lessonId}`;
  };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const reconnectingAuthRef = useRef(false);

  const fetchSocketToken = async (): Promise<string> => {
    const res = await apiClient.get<TokenResponse>('/auth/token');
    return res.data?.token || '';
  };

  const shouldRefreshAuth = (error: Error) => {
    const message = error.message.toLowerCase();
    return AUTH_ERROR_MESSAGES.some((fragment) => message.includes(fragment));
  };

  useEffect(() => {
    const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register');
    let active = true;

    const disconnectSocket = () => {
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (socketRef.current) {
        if (socketRef.current.connected) {
          socketRef.current.emit('presence:offline');
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };

    const buildPresencePayload = () => {
      const payload: { classId?: string; lessonId?: string } = {};
      try {
        const classId = window.localStorage.getItem('currentClassId');
        const lessonMatch = pathname?.match(/\/student\/lesson\/([^/]+)/);
        if (classId) payload.classId = classId;
        if (lessonMatch?.[1]) payload.lessonId = decodeURIComponent(lessonMatch[1]);
      } catch {
        // Presence metadata is best-effort only.
      }
      return payload;
    };

    const startHeartbeat = (socket: Socket) => {
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current);
      }

      const sendHeartbeat = () => {
        if (socket.connected) {
          socket.emit('presence:heartbeat', buildPresencePayload());
        }
      };

      sendHeartbeat();
      heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, 25000);
    };

    const connectSocket = async () => {
      try {
        const token = await fetchSocketToken();
        if (!active) return;
        if (!token) {
          console.warn('Socket.IO Notification: No token returned from server');
          disconnectSocket();
          return;
        }

        if (socketRef.current) {
          socketRef.current.auth = { token };
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          } else {
            startHeartbeat(socketRef.current);
          }
          return;
        }

        const socket = io(`${resolveSocketBackendUrl()}/notifications`, {
          path: '/socket.io',
          auth: { token },
          transports: ['websocket', 'polling'],
          withCredentials: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        });

        socket.on('connect', () => {
          reconnectingAuthRef.current = false;
          startHeartbeat(socket);
          console.log('Connected to Notifications Socket.IO');
        });

        socket.on('disconnect', (reason) => {
          if (heartbeatIntervalRef.current) {
            window.clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          console.warn('Notifications Socket.IO disconnected:', reason);
        });

        socket.on('notification', (payload: NotificationPayload) => {
          try {
            const id = crypto.randomUUID();
            const createdAt = new Date().toISOString();
            const newToast = {
              id,
              title: payload.title || 'Thông báo mới',
              message: payload.message || '',
              type: payload.type || 'DEFAULT',
              lessonId: payload.lessonId,
              path: payload.path,
            };
            const storedNotification: StoredNotification = {
              ...newToast,
              createdAt,
            };

            setToasts((prev) => [...prev, newToast]);
            persistNotification(storedNotification);

            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 5000);
          } catch (err) {
            console.error('Failed to parse notification message:', err);
          }
        });

        socket.on('connect_error', async (err: Error) => {
          console.error('Socket.IO Notification error:', err);

          if (!active || reconnectingAuthRef.current || !shouldRefreshAuth(err)) {
            return;
          }

          reconnectingAuthRef.current = true;

          try {
            const refreshedToken = await fetchSocketToken();
            if (!active || !refreshedToken) {
              reconnectingAuthRef.current = false;
              return;
            }
            socket.auth = { token: refreshedToken };
            socket.connect();
          } catch (tokenError) {
            reconnectingAuthRef.current = false;
            console.error('Failed to refresh socket token:', tokenError);
          }
        });

        socketRef.current = socket;
      } catch (err) {
        console.error('Failed to fetch socket token:', err);
      }
    };

    if (isAuthPage) {
      disconnectSocket();
      return () => {
        active = false;
      };
    }

    void connectSocket();
    window.addEventListener('pagehide', disconnectSocket);
    window.addEventListener('beforeunload', disconnectSocket);

    return () => {
      active = false;
      window.removeEventListener('pagehide', disconnectSocket);
      window.removeEventListener('beforeunload', disconnectSocket);
    };
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  if (toasts.length === 0) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[2147483647] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes toast-slide-in {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-pop {
          0% { transform: translateX(120%) scale(0.95); opacity: 0; }
          70% { transform: translateX(0) scale(1.02); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        .toast-animate {
          animation: toast-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {toasts.map((toast) => {
        let borderClass = "border-brand bg-[var(--color-surface)]/95";
        
        if (toast.type === 'ASSIGNMENT_PUBLISHED') {
          borderClass = "border-accent bg-accent/10";
        } else if (toast.type === 'ASSIGNMENT_SUBMITTED') {
          borderClass = "border-emerald-500 bg-emerald-500/10";
        } else if (toast.type === 'ASSIGNMENT_GRADED') {
          borderClass = "border-amber-500 bg-amber-500/10";
        } else if (toast.type === 'COPILOT_REPORT_READY') {
          borderClass = "border-sky-500 bg-sky-500/10";
        } else if (toast.type === 'COPILOT_REPORT_FAILED') {
          borderClass = "border-rose-500 bg-rose-500/10";
        }

        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.path || toast.lessonId) {
                openNotificationTarget(toast);
                return;
              }
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }}
            className={`toast-animate pointer-events-auto border-l-4 p-4 rounded-xl shadow-xl backdrop-blur-md flex items-start justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${borderClass}`}
          >
            <div className="flex-1 pr-3">
              <h4 className="font-bold text-sm text-[var(--color-text)]">{toast.title}</h4>
              <p className="text-xs text-[var(--color-muted)] mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xs font-semibold focus:outline-none">✕</button>
          </div>
        );
      })}
    </div>
    ,
    document.body,
  );
}
