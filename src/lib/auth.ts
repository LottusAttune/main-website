import 'server-only';

import { cookies } from 'next/headers';

/**
 * Studio access.
 *
 * A single shared password gates /studio — Silvana is the only user, so a full
 * account system would be more surface than the problem needs. The cookie is
 * HMAC-signed with SESSION_SECRET, httpOnly and SameSite=Lax, so it cannot be
 * read or forged from the browser.
 */

const COOKIE_NAME = 'lotus_studio';
const SESSION_DAYS = 14;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Generate one with: openssl rand -base64 32'
    );
  }
  return value;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  return Buffer.from(signature).toString('base64url');
}

/** Constant-time compare, so a wrong password leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isStudioConfigured(): boolean {
  return Boolean(process.env.STUDIO_PASSWORD && process.env.SESSION_SECRET);
}

export function checkPassword(attempt: string): boolean {
  const expected = process.env.STUDIO_PASSWORD;
  if (!expected) return false;
  return safeEqual(attempt, expected);
}

export async function createSession(): Promise<void> {
  const expires = Date.now() + SESSION_MS;
  const payload = String(expires);
  const token = `${payload}.${await sign(payload)}`;

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isSignedIn(): Promise<boolean> {
  if (!isStudioConfigured()) return false;

  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  try {
    if (!safeEqual(signature, await sign(payload))) return false;
  } catch {
    return false;
  }

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

/**
 * Guard for every studio route handler. Data endpoints must fail closed — a
 * missing STUDIO_PASSWORD or SESSION_SECRET denies access rather than opening it.
 */
export async function requireStudio(): Promise<void> {
  if (!(await isSignedIn())) {
    throw new StudioUnauthorizedError();
  }
}

export class StudioUnauthorizedError extends Error {
  constructor() {
    super('Not signed in.');
    this.name = 'StudioUnauthorizedError';
  }
}
