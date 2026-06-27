import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { config } from './config';

export type Session = {
  admin?: boolean;
  loggedAt?: number;
};

const opts: SessionOptions = {
  password: config.admin.sessionSecret,
  cookieName: 'fps_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession(): Promise<Session & { save: () => Promise<void>; destroy: () => Promise<void> }> {
  return getIronSession<Session>(cookies(), opts) as any;
}

export async function requireAdmin(): Promise<boolean> {
  const s = await getSession();
  return !!s.admin;
}
