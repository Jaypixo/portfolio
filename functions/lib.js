const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errorResponse(message, status = 400) {
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
  const token = parseAuthToken(request);
  if (!token) return null;
  const payload = await verifyToken(token, env.ADMIN_TOKEN_SECRET);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export function encodeContent(content) {
  const bytes = textEncoder.encode(content);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function shortJsonResponse(data, status = 200) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
  return response;
}

export { jsonResponse, errorResponse };
