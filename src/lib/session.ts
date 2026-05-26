import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SITE_CODE, SITE_NAME } from './dtspace';
import { isAdminSession } from './admin';
import type { SessionInfo } from './types';

export interface SessionPayload {
  jwt: string;
  info: SessionInfo;
}

const COOKIE_MAX_AGE = 60 * 60 * 12;

// Resolved lazily so missing-secret errors only surface at request time, not
// during build-time page-data collection (where env is not always populated).
function getSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  return 'dev-only-insecure-secret-do-not-use-anywhere-near-production';
}

const enc = new TextEncoder();
let cachedKey: CryptoKey | null = null;
async function hmacKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return cachedKey;
}

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + ((4 - (s.length % 4)) % 4), '=');
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncodeText(text: string): string {
  return b64urlEncodeBytes(enc.encode(text));
}

function b64urlDecodeText(s: string): string {
  return new TextDecoder().decode(b64urlDecodeBytes(s));
}

async function signPart(body: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return b64urlEncodeBytes(new Uint8Array(sig));
}

async function verifyPart(body: string, sig: string): Promise<boolean> {
  const key = await hmacKey();
  let sigBytes: Uint8Array;
  try {
    sigBytes = b64urlDecodeBytes(sig);
  } catch {
    return false;
  }
  // BufferSource on subtle.verify expects ArrayBuffer in some TS lib targets;
  // copy into a fresh ArrayBuffer to satisfy the type.
  const buf = new ArrayBuffer(sigBytes.byteLength);
  new Uint8Array(buf).set(sigBytes);
  return crypto.subtle.verify('HMAC', key, buf, enc.encode(body));
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  const body = b64urlEncodeText(JSON.stringify(payload));
  const sig = await signPart(body);
  return `${body}.${sig}`;
}

export async function decodeSession(value: string): Promise<SessionPayload | null> {
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const ok = await verifyPart(body, sig);
  if (!ok) return null;
  try {
    const parsed = JSON.parse(b64urlDecodeText(body)) as SessionPayload;
    if (!parsed?.jwt || !parsed?.info?.dong || !parsed?.info?.ho) return null;
    if (!parsed.info.displayDong) parsed.info.displayDong = parsed.info.dong;
    if (typeof parsed.info.isAdmin !== 'boolean') {
      parsed.info.isAdmin = isAdminSession(parsed.info);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAME,
    value: await encodeSession(payload),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function buildSessionInfo(input: {
  user: Record<string, unknown> & { nmCstm?: string; dong?: string; ho?: string; noMphn?: string };
  fallback: { nmCstm: string; dong: string; ho: string; noMphn: string };
  displayDong: string;
}): SessionInfo {
  const dong = String(input.user.dong ?? input.fallback.dong);
  const ho = String(input.user.ho ?? input.fallback.ho);
  return {
    cdSite: SITE_CODE,
    nmSite: SITE_NAME,
    dong,
    displayDong: input.displayDong,
    ho,
    nmCstm: String(input.user.nmCstm ?? input.fallback.nmCstm),
    noMphn: String(input.user.noMphn ?? input.fallback.noMphn),
    isAdmin: isAdminSession({ dong, ho }),
  };
}
