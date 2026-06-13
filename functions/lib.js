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

function parseAuthToken(request) {
  const header = request.headers.get('Authorization') || '';
  const [type, token] = header.split(' ');
  return type === 'Bearer' ? token : null;
}

function toBase64Url(buffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return new Uint8Array(signature);
}

function equalUint8(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

// Admin sessions last 12 hours before requiring a fresh login.
export const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

export function createToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = toBase64Url(textEncoder.encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  return hmac(secret, `${encodedHeader}.${encodedPayload}`)
    .then(signature => `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`);
}

export async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signature = fromBase64Url(encodedSignature);
  const expected = await hmac(secret, `${encodedHeader}.${encodedPayload}`);
  if (!equalUint8(signature, expected)) return null;
  const payload = JSON.parse(textDecoder.decode(fromBase64Url(encodedPayload)));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN_SECRET) return null;
  const token = parseAuthToken(request);
  if (!token) return null;
  const payload = await verifyToken(token, env.ADMIN_TOKEN_SECRET);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// ─── POST HELPERS ───

export function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Appends -2, -3, ... until the slug is unique among the other posts.
export function uniqueSlug(base, posts, ignoreId) {
  const slug = base || 'post';
  const taken = new Set(posts.filter(p => p.id !== ignoreId).map(p => p.slug));
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

// Fills in defaults for posts written before tags/slug/published existed.
export function normalizePost(post) {
  const date = post.date || new Date().toISOString();
  const title = (post.title || '').toString().trim();
  return {
    id: post.id,
    slug: post.slug || slugify(title) || String(post.id),
    title,
    content: (post.content || '').toString(),
    tags: Array.isArray(post.tags) ? post.tags.map(t => String(t).trim()).filter(Boolean) : [],
    published: post.published !== false,
    date,
    updated: post.updated || date
  };
}

export function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getPosts(env) {
  if (!env.BLOG) return [];
  try {
    const posts = await env.BLOG.get('posts', 'json');
    return Array.isArray(posts) ? posts.map(normalizePost) : [];
  } catch (error) {
    console.error('KV read error:', error);
    return [];
  }
}

export async function savePosts(env, posts) {
  if (!env.BLOG) throw new Error('KV binding not configured');
  await env.BLOG.put('posts', JSON.stringify(posts));
}
