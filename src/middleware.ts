import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      if (pathname === '/') return NextResponse.next();
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (pathname.startsWith('/admin')) {
      const role = token.role as string | undefined;
      if (role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === '/' || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname === '/favicon.ico') {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/', '/dashboard/:path*', '/onboarding/:path*', '/map/:path*', '/connections/:path*', '/chat/:path*', '/profile/:path*', '/settings/:path*', '/admin/:path*'],
};
