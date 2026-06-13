import {
  errorResponse,
  jsonResponse,
  requireAdmin,
  getPosts,
  savePosts,
  normalizePost,
  slugify,
  uniqueSlug
} from '../../lib.js';

function findPostIndex(posts, idParam) {
  return posts.findIndex(post => String(post.id) === idParam || post.slug === idParam);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const idParam = params.id;

  if (request.method === 'GET') {
    const posts = await getPosts(env);
    const index = findPostIndex(posts, idParam);
    if (index === -1) return errorResponse('Post not found', 404);

    const post = posts[index];
    if (!post.published) {
      const admin = await requireAdmin(request, env);
      if (!admin) return errorResponse('Post not found', 404);
    }
    return jsonResponse(post);
  }

  const auth = await requireAdmin(request, env);
  if (!auth) return errorResponse('Unauthorized', 401);

  const posts = await getPosts(env);
  const index = findPostIndex(posts, idParam);
  if (index === -1) return errorResponse('Post not found', 404);

  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse('Invalid request body', 400);

    const existing = posts[index];
    const title = typeof body.title === 'string' && body.title.trim() ? body.title : existing.title;
    const content = typeof body.content === 'string' && body.content.trim() ? body.content : existing.content;

    const slugSource = body.slug !== undefined ? body.slug : (body.title !== undefined ? title : existing.slug);
    const slugBase = slugify(slugSource) || existing.slug;

    const updated = normalizePost({
      ...existing,
      title,
      content,
      slug: uniqueSlug(slugBase, posts, existing.id),
      tags: body.tags !== undefined ? body.tags : existing.tags,
      published: body.published !== undefined ? body.published : existing.published,
      updated: new Date().toISOString()
    });

    posts[index] = updated;
    await savePosts(env, posts);
    return jsonResponse(updated);
  }

  if (request.method === 'DELETE') {
    posts.splice(index, 1);
    await savePosts(env, posts);
    return jsonResponse({ success: true });
  }

  return errorResponse('Method not allowed', 405);
}
