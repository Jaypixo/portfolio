import { createToken, errorResponse, jsonResponse, TOKEN_TTL_MS } from '../lib.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return errorResponse('Expected application/json', 400);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== 'string') {
    return errorResponse('Missing password', 400);
  }

  if (!env.ADMIN_PASSWORD || !env.ADMIN_TOKEN_SECRET) {
    return errorResponse('Admin auth not configured', 500);
  }

  if (body.password !== env.ADMIN_PASSWORD) {
    return errorResponse('Invalid credentials', 401);
  }

  const exp = Date.now() + TOKEN_TTL_MS;
  const token = await createToken({ role: 'admin', exp }, env.ADMIN_TOKEN_SECRET);
  return jsonResponse({ token, exp });
}
