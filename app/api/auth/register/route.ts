import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Forward registration to your backend
    const backendRes = await fetch(`http://localhost:8080/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!backendRes.ok) {
      const err = await backendRes.json();
      return NextResponse.json(
        { error: err.error || 'Registration failed' },
        { status: backendRes.status }
      );
    }

    // Backend returns nothing, just confirm success
    const response = NextResponse.json({ message: 'Registration successful' }, { status: 201 });
    return response;
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
