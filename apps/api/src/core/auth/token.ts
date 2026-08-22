import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '@cafeos/shared';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: string;
  services: string[];
  domain: string;
  branch?: {
    id: string;
    slug: string;
    name: string;
    address?: string;
  };
  name: string;
  iat: number;
  exp: number;
  iss: string;
};

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function hmac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function signAuthToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'iss'>, secret: string, issuer: string, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const full: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    iss: issuer,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(full));
  const unsigned = `${header}.${body}`;
  const signature = hmac(unsigned, secret);
  return `${unsigned}.${signature}`;
}

export function verifyAuthToken(token: string, secret: string, issuer: string): AuthTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw AppError.unauthorized('Invalid token format');
  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = hmac(unsigned, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw AppError.unauthorized('Invalid signature');

  let payload: AuthTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid token');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== issuer) throw AppError.unauthorized('Invalid issuer');
  if (payload.exp <= now) throw AppError.unauthorized('Token expired');
  return payload;
}
