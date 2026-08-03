const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
}

function equalUint8(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

export async function createToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = toBase64Url(textEncoder.encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = await hmac(secret, `${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
}

export async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let signature;
  try {
    signature = fromBase64Url(encodedSignature);
  } catch {
    return null;
  }
  const expected = new Uint8Array(await hmac(secret, `${encodedHeader}.${encodedPayload}`));
  if (!equalUint8(signature, expected)) return null;
  try {
    const payload = JSON.parse(textDecoder.decode(fromBase64Url(encodedPayload)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseAuthToken(request) {
  const header = request.headers.get('Authorization') || '';
  const [type, token] = header.split(' ');
  return type === 'Bearer' ? token : null;
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN_SECRET) return null;
  const token = parseAuthToken(request);
  if (!token) return null;
  const payload = await verifyToken(token, env.ADMIN_TOKEN_SECRET);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 96 && SLUG_RE.test(slug);
}

function deriveExcerpt(text, maxLen = 300) {
  const plain = String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/[#>*`_~\-+=|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= maxLen ? plain : plain.slice(0, maxLen).trim() + '…';
}

function isLegacyPost(post) {
  return typeof post.id !== 'string' || typeof post.slug !== 'string' || !post.slug;
}

function normalizeLegacyPost(post, existingSlugs) {
  if (!isLegacyPost(post)) return post;

  const id = typeof post.id === 'string' ? post.id : String(post.id);
  const body = typeof post.body === 'string' ? post.body : (typeof post.content === 'string' ? post.content : '');
  const baseSlug = slugify(post.title || id) || `post-${id}`;
  let slug = baseSlug;
  let n = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  existingSlugs.add(slug);

  const createdAt = post.createdAt || post.date || new Date().toISOString();

  return {
    id,
    title: post.title || 'Untitled',
    slug,
    excerpt: typeof post.excerpt === 'string' && post.excerpt ? post.excerpt : deriveExcerpt(body),
    body,
    published: typeof post.published === 'boolean' ? post.published : true,
    featured: Boolean(post.featured),
    tags: normalizeTags(post.tags),
    coverImage: normalizeCoverImage(post.coverImage),
    createdAt,
    updatedAt: post.updatedAt || createdAt
  };
}

export async function getPosts(env) {
  if (!env.BLOG) return [];
  const raw = await env.BLOG.get('posts', 'json');
  const posts = Array.isArray(raw) ? raw : [];
  if (!posts.length) return posts;

  const existingSlugs = new Set(posts.filter(p => typeof p.slug === 'string' && p.slug).map(p => p.slug));
  let migrated = false;
  const normalized = posts.map(post => {
    if (isLegacyPost(post)) migrated = true;
    return normalizeLegacyPost(post, existingSlugs);
  });

  if (migrated) {
    await savePosts(env, normalized);
  }

  return normalized;
}

export async function savePosts(env, posts) {
  await env.BLOG.put('posts', JSON.stringify(posts));
}

export function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function publicView(post) {
  return post.published ? post : null;
}

export function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const tags = [];
  for (const raw of input) {
    const tag = String(raw || '').trim().toLowerCase().slice(0, 32);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags.slice(0, 12);
}

export function normalizeCoverImage(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed.slice(0, 2048);
}
