import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET;

export async function middleware(request: NextRequest) {
  // Allow login page and auth API routes without authentication
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/login-wbg' ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/api/jobs') ||
    request.nextUrl.pathname.startsWith('/api/brain') ||
    request.nextUrl.pathname.startsWith('/api/procurement-brain') ||
    request.nextUrl.pathname.startsWith('/api/procurement-base') ||
    request.nextUrl.pathname.startsWith('/api/worldbank-brain') ||
    request.nextUrl.pathname.startsWith('/api/worldbank-admin-brain') ||
    request.nextUrl.pathname.startsWith('/api/worldbank-base') ||
    request.nextUrl.pathname.startsWith('/api/worldbank-projects') ||
    request.nextUrl.pathname.startsWith('/api/tenders') ||
    request.nextUrl.pathname.startsWith('/api/funds') ||
    request.nextUrl.pathname.startsWith('/api/documents') ||
    request.nextUrl.pathname.startsWith('/api/debug')
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // No token - redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify JWT token
    if (!AUTH_SECRET) {
      console.error('AUTH_SECRET not configured');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const secret = new TextEncoder().encode(AUTH_SECRET);
    await jwtVerify(token, secret);

    // Token valid - allow request to proceed
    return NextResponse.next();
  } catch (error) {
    // Invalid or expired token - redirect to login
    console.error('Auth token validation failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  // Protect all routes except static files, images, and public assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'],
};
