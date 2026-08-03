import {
  errorResponse,
  getPosts,
  isValidSlug,
  jsonResponse,
  normalizeCoverImage,
  normalizeTags,
  requireAdmin,
  savePosts,
  slugify
} from '../../lib.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const admin = await requireAdmin(request, env);
  const posts = await getPosts(env);
  const post = posts.find(p => p.slug === params.slug);
  if (!post || (!post.published && !admin)) {
    return errorResponse('Post not found', 404);
  }
  return jsonResponse(post);
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('Unauthorized', 401);
  if (!env.BLOG) return errorResponse('KV binding not configured', 500);

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return errorResponse('Title is required', 400);
  }

  const posts = await getPosts(env);
  const index = posts.findIndex(p => p.slug === params.slug);
  if (index === -1) return errorResponse('Post not found', 404);

  const slug = isValidSlug(body.slug) ? body.slug : slugify(body.slug || body.title);
  if (!isValidSlug(slug)) {
    return errorResponse('Could not derive a valid slug from the title', 400);
  }
  if (posts.some((p, i) => i !== index && p.slug === slug)) {
    return errorResponse('A post with that slug already exists', 409);
  }

  const existing = posts[index];
  const updated = {
    ...existing,
    title: body.title.trim().slice(0, 200),
    slug,
    excerpt: typeof body.excerpt === 'string' ? body.excerpt.trim().slice(0, 400) : '',
    body: typeof body.body === 'string' ? body.body : '',
    published: Boolean(body.published),
    featured: Boolean(body.featured),
    tags: normalizeTags(body.tags),
    coverImage: normalizeCoverImage(body.coverImage),
    updatedAt: new Date().toISOString()
  };

  posts[index] = updated;
  await savePosts(env, posts);
  return jsonResponse(updated);
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('Unauthorized', 401);
  if (!env.BLOG) return errorResponse('KV binding not configured', 500);

  const posts = await getPosts(env);
  const index = posts.findIndex(p => p.slug === params.slug);
  if (index === -1) return errorResponse('Post not found', 404);

  posts.splice(index, 1);
  await savePosts(env, posts);
  return jsonResponse({ success: true });
}
