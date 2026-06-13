import {
  errorResponse,
  jsonResponse,
  requireAdmin,
  getPosts,
  savePosts,
  sortPosts,
  normalizePost,
  slugify,
  uniqueSlug
} from '../lib.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'GET') {
    const posts = sortPosts(await getPosts(env));
    const admin = await requireAdmin(request, env);
    const visible = admin ? posts : posts.filter(post => post.published);
    return jsonResponse(visible);
  }

  if (request.method === 'POST') {
    const auth = await requireAdmin(request, env);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.title !== 'string' || !body.title.trim()) {
      return errorResponse('Title is required', 400);
    }
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return errorResponse('Content is required', 400);
    }

    const posts = await getPosts(env);
    const now = new Date().toISOString();
    const id = Date.now();
    const slugBase = slugify(body.slug || body.title) || String(id);

    const post = normalizePost({
      id,
      slug: uniqueSlug(slugBase, posts, id),
      title: body.title,
      content: body.content,
      tags: body.tags,
      published: body.published,
      date: now,
      updated: now
    });

    posts.push(post);
    await savePosts(env, posts);
    return jsonResponse(post, 201);
  }

  return errorResponse('Method not allowed', 405);
}
