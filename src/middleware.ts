import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

export const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = (session?.user as any)?.role;

  // Add all public paths here
  const publicPaths = ['/login', '/gate', '/', '/about', '/contact'];
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/api/auth');

  if (isPublicPath) {
    if (isLoggedIn && pathname === '/login') {
      const dest = getDashboard(role);
      if (dest !== '/login') {
        return NextResponse.redirect(new URL(dest, req.nextUrl));
      }
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (pathname.startsWith('/student') && role !== 'STUDENT') {
    return NextResponse.redirect(new URL(getDashboard(role), req.nextUrl));
  }
  if (pathname.startsWith('/staff') && role !== 'STAFF') {
    return NextResponse.redirect(new URL(getDashboard(role), req.nextUrl));
  }
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL(getDashboard(role), req.nextUrl));
  }

  return NextResponse.next();
});

function getDashboard(role: string | undefined) {
  switch (role) {
    case 'STUDENT':
      return '/student';
    case 'STAFF':
      return '/staff';
    case 'ADMIN':
      return '/admin';
    default:
      return '/login';
  }
}

export const config = {
  matcher: ['/((?!_next|public|favicon.ico|api/clearance/verify|api/assistant).*)'],
};
