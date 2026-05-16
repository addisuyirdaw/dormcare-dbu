import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = (session?.user as any)?.role;

  if (pathname === '/login' || pathname === '/gate' || pathname.startsWith('/api/auth')) {
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL(getDashboard(role), req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/student') && role !== 'STUDENT') {
    return NextResponse.redirect(new URL(getDashboard(role), req.url));
  }
  if (pathname.startsWith('/staff') && role !== 'STAFF') {
    return NextResponse.redirect(new URL(getDashboard(role), req.url));
  }
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL(getDashboard(role), req.url));
  }

  return NextResponse.next();
});

function getDashboard(role: string | undefined) {
  switch (role) {
    case 'STUDENT': return '/student';
    case 'STAFF':   return '/staff';
    case 'ADMIN':   return '/admin';
    default:        return '/login';
  }
}

export const config = {
  matcher: ['/((?!_next|public|favicon.ico|api/clearance/verify|api/assistant).*)'],
};
