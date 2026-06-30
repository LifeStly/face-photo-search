import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { config } from './config';

export type Session = {
  admin?: boolean;
  loggedAt?: number;
};

// Event auth: user สแกน QR แล้วใส่ password — session จำว่าผ่าน gate ของ code ไหนบ้าง
// แยก cookie จาก admin เพราะ TTL ต่างกัน (admin 8h, event 7d) + ไม่อยาก trip ตัด admin session
export type EventSession = {
  events?: Record<string, number>; // code → expires_at_ms
};

const adminOpts: SessionOptions = {
  password: config.admin.sessionSecret,
  cookieName: 'fps_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  },
};

const eventOpts: SessionOptions = {
  password: config.admin.sessionSecret,
  cookieName: 'fps_event',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession(): Promise<Session & { save: () => Promise<void>; destroy: () => Promise<void> }> {
  return getIronSession<Session>(cookies(), adminOpts) as any;
}

export async function requireAdmin(): Promise<boolean> {
  const s = await getSession();
  return !!s.admin;
}

export async function getEventSession(): Promise<EventSession & { save: () => Promise<void>; destroy: () => Promise<void> }> {
  return getIronSession<EventSession>(cookies(), eventOpts) as any;
}

/**
 * อ่าน event session แล้วเช็คว่า user ผ่าน gate ของ code นี้หรือยัง (ยังไม่ expired)
 */
export async function isEventAuthed(code: string): Promise<boolean> {
  const s = await getEventSession();
  const exp = s.events?.[code];
  return typeof exp === 'number' && exp > Date.now();
}
