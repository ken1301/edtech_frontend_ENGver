import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface DecodedToken {
  role?: string;
  isBetaActivated?: boolean;
}

function decodeJwtPayload(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get('access_token');
  const token = tokenCookie?.value;
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith('/login');

  // Bẻ gãy Infinite Loop: Nếu URL có clear_cookie=1, xoá cookie và redirect về /login sạch
  if (request.nextUrl.searchParams.get('clear_cookie') === '1') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token) {
    const decoded = decodeJwtPayload(token);
    const role = decoded?.role;

    if (isLoginPage) {
      if (role === 'ADMIN' || role === 'TEACHER') {
        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
      } else if (role === 'STUDENT') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // Role-based route guards
    if (role === 'STUDENT' && pathname.startsWith('/teacher')) {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }

    if (role === 'TEACHER' && pathname.startsWith('/student')) {
      return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/student/:path*',
    '/teacher/:path*',
    '/login'
  ],
};
