import { errorResponse, jsonResponse, requireAdmin } from '../lib.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'GET') {
    try {
      const posts = await env.BLOG.get('posts', 'json');
      return jsonResponse(posts || []);
    } catch (error) {
      console.error('KV read error:', error);
      return jsonResponse([]);
    }
  }

  if (request.method === 'PUT') {
    const auth = await requireAdmin(request, env);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.posts)) {
      return errorResponse('Missing posts array', 400);
    }

    if (!env.BLOG) {
      return errorResponse('KV binding not configured', 500);
    }

    try {
      await env.BLOG.put('posts', JSON.stringify(body.posts));
      return jsonResponse({ success: true, message: 'Posts saved to Cloudflare KV' });
    } catch (error) {
      console.error('KV write error:', error);
      return errorResponse('Failed to save posts', 502);
    }
  }

  return errorResponse('Method not allowed', 405);
}

