import { createAPIFileRoute } from '@tanstack/react-start/api';
import { loginSchema } from '~/lib/schemas';
import { env } from '~/env';
import { getSessionToken } from '~/lib/session';

export const APIRoute = createAPIFileRoute('/api/auth')({
  POST: async ({ request }) => {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.errors }), { status: 400 });
    }
    const { email, password } = parsed.data;
    const response = await fetch(`${env.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Login failed' }), { status: 401 });
    }
    const data = await response.json();
    if (!data.expiresAt) {
      return new Response(JSON.stringify({ error: 'Invalid login response: missing expiration time' }), { status: 500 });
    }
    const cookie = `session=${data.token}; HttpOnly; Path=/; SameSite=${process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax'}; Secure=${process.env.NODE_ENV === 'production'}; Expires=${new Date(data.expiresAt).toUTCString()}`;
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    });
  },
  GET: async ({ request }) => {
    const token = getSessionToken(request);
    if (!token) {
      return new Response(JSON.stringify({ error: 'No session token' }), { status: 401 });
    }
    const response = await fetch(`${env.API_URL}/auth/validate-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
}); 