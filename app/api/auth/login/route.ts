import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
  }

  try {
    // Forward login to your backend
    const backendRes = await fetch(`http://localhost:8080/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!backendRes.ok || backendRes == null) {
      const err = await backendRes.json();
      return NextResponse.json(
        { error: err.error || 'Login failed' },
        { status: backendRes.status }
      );
    }

    const backendData = await backendRes.json();
    console.log('Backend login response:', backendData);

    // Create a session on the frontend
    const sessionId = crypto.randomBytes(32).toString('hex');

    const response = NextResponse.json(
      {
        user: { email },
        settings: backendData.settings || backendData,
      },
      { status: 200 }
    );

    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
