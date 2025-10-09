import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const AUTH_USERNAME = process.env.AUTH_USERNAME;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_USERNAME || !AUTH_PASSWORD || !AUTH_SECRET) {
  console.error('❌ AUTH environment variables not configured');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Debug logging for staging
    console.log('🔐 Login attempt:', {
      receivedUsername: username,
      expectedUsername: AUTH_USERNAME,
      usernameMatch: username === AUTH_USERNAME,
      passwordMatch: password === AUTH_PASSWORD,
      envVarsPresent: {
        AUTH_USERNAME: !!AUTH_USERNAME,
        AUTH_PASSWORD: !!AUTH_PASSWORD,
        AUTH_SECRET: !!AUTH_SECRET,
      }
    });

    // Validate credentials against environment variables
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      // Create JWT token (7 days expiry)
      const secret = new TextEncoder().encode(AUTH_SECRET);
      const token = await new SignJWT({ username, authenticated: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

      // Set secure HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return NextResponse.json({
        success: true,
        message: 'Login successful',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
