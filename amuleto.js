const crypto = require('crypto');

const JWT_SECRET = 'vampire_base_secret_key_2024_!@#$%';
const JWT_EXPIRATION = 3600;

function base64UrlEncode(data) {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(data) {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString();
}

function generateToken(userId) {
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
  const payload = base64UrlEncode(
    JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + JWT_EXPIRATION, user_id: userId })
  );
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

function validateToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest()
  );

  if (signature !== expectedSignature) return null;

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function getUserIdFromToken(token) {
  const data = validateToken(token);
  return data?.user_id || null;
}

function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

module.exports = { generateToken, validateToken, getUserIdFromToken, getTokenFromHeader };