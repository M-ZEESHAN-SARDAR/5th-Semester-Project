import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';
import type { User, UserRole } from '../src/shared/types';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export interface AuthRequest extends Request {
  user?: User;
}

interface TokenPayload {
  sub: number;
  role: UserRole;
  exp: number;
}

export function signToken(userId: number, role: UserRole): string {
  const payload: TokenPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = decodeURIComponent(part.slice(eqIdx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1';

  const attributes = [
    `nb_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${TOKEN_TTL_SEC}`,
  ];
  if (isHttps) {
    attributes.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attributes.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1';

  const attributes = ['nb_session=', 'HttpOnly', 'Path=/', 'Max-Age=0'];
  if (isHttps) {
    attributes.push('Secure', 'SameSite=None', 'Partitioned');
  }
  res.setHeader('Set-Cookie', attributes.join('; '));
}

function extractUserFromRequest(req: Request): { user: User | null; viaCookie: boolean } {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token);
    if (payload) {
      const user = db
        .prepare('SELECT id, name, email, role, created_at FROM Users WHERE id = ?')
        .get(payload.sub) as User | undefined;
      return { user: user ?? null, viaCookie: false };
    }
  }

  const cookies = parseCookies(req);
  if (cookies.nb_session) {
    const payload = verifyToken(cookies.nb_session);
    if (payload) {
      const user = db
        .prepare('SELECT id, name, email, role, created_at FROM Users WHERE id = ?')
        .get(payload.sub) as User | undefined;
      return { user: user ?? null, viaCookie: true };
    }
  }

  return { user: null, viaCookie: false };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const { user, viaCookie } = extractUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  // CSRF check for cookie-authenticated mutations
  if (viaCookie && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const xRequestedWith = req.headers['x-requested-with'];
    const origin = req.headers.origin;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const originMatchesHost =
      typeof origin === 'string' &&
      typeof host === 'string' &&
      (() => {
        try {
          return new URL(origin).host === host;
        } catch {
          return false;
        }
      })();

    if (xRequestedWith !== 'NutriBudget' && !originMatchesHost) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }
  }

  req.user = user;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}
