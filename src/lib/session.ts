import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SITE_CODE, SITE_NAME } from './dtspace';
import type { SessionInfo } from './types';

export interface SessionPayload {
  jwt: string;
  info: SessionInfo;
}

const COOKIE_MAX_AGE = 60 * 60 * 12;

export function encodeSession(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeSession(value: string): SessionPayload | null {
  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed?.jwt || !parsed?.info?.dong || !parsed?.info?.ho) return null;
    if (!parsed.info.displayDong) parsed.info.displayDong = parsed.info.dong;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAME,
    value: encodeSession(payload),
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
  return {
    cdSite: SITE_CODE,
    nmSite: SITE_NAME,
    dong: String(input.user.dong ?? input.fallback.dong),
    displayDong: input.displayDong,
    ho: String(input.user.ho ?? input.fallback.ho),
    nmCstm: String(input.user.nmCstm ?? input.fallback.nmCstm),
    noMphn: String(input.user.noMphn ?? input.fallback.noMphn),
  };
}
