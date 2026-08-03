import { createToken, errorResponse, jsonResponse } from '../lib.js';

export async function onRequestPost(context) {
  const { request, env } = context;

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

  const token = await createToken({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 }, env.ADMIN_TOKEN_SECRET);
  return jsonResponse({ token });
}
