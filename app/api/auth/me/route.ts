import { NextRequest, NextResponse } from 'next/server';

interface UserData {
  user: {
    email: string;
  };
  settings?: {
    name?: string;
    voice?: string;
    personality?: string;
    language?: string;
  } | null;
}

async function fetchUserFromBackend(sessionId: string): Promise<UserData | null> {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    console.warn('BACKEND_URL not configured, cannot validate session');
    return null;
  }

  try {
    const endpoint = `${backendUrl.replace(/\/$/, '')}/api/sessions/${encodeURIComponent(
      sessionId
    )}`;

    console.log(`Validating session ${sessionId} against backend`);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(
        `Backend session validation failed: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const data = await res.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid response from backend: not an object');
      return null;
    }

    // Ensure user object exists with required email field
    if (!data.user || !data.user.email || typeof data.user.email !== 'string') {
      console.error('Invalid user data from backend: missing or invalid email');
      return null;
    }

    // Return the validated user data with optional settings
    const userData: UserData = {
      user: {
        email: data.user.email,
      },
      settings: data.settings ?? null,
    };

    console.log(`Session ${sessionId} validated successfully for user: ${data.user.email}`);
    return userData;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        console.error('Session validation request timed out');
      } else {
        console.error(`Error validating session with backend: ${err.message}`);
      }
    } else {
      console.error('Error validating session with backend:', err);
    }
    return null;
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!sessionId || sessionId.trim() === '') {
    return NextResponse.json(
      { error: 'Not authenticated. Session cookie missing.' },
      { status: 401 }
    );
  }

  // Validate sessionId format
  if (typeof sessionId !== 'string' || sessionId.length < 1) {
    return NextResponse.json(
      { error: 'Invalid session ID format' },
      { status: 401 }
    );
  }

  // Attempt to fetch real user data from backend
  const userData = await fetchUserFromBackend(sessionId);

  if (userData) {
    // Successfully validated against backend and retrieved user data
    return NextResponse.json(userData, { status: 200 });
  }

  // Backend validation failed or not configured
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.warn(
      'Development mode: Returning mock user data (backend validation failed or not configured)'
    );
    // Return valid user structure matching the template
    /*return NextResponse.json(
      {
        user: {
          email: 'dev-user@example.com',
        },
        settings: null,
      },
      { status: 200 }
    );*/
  }

  // Production: require valid backend session
  return NextResponse.json(
    { error: 'Session validation failed. Please log in again.' },
    { status: 401 }
  );
}
