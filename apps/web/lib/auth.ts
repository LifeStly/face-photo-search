import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { config } from './config';
import { DEFAULT_TENANT_ID } from './db';

export type Role = 'super' | 'tenant_admin';

/**
 * Session shape (Phase A):
 * - `admin: true` คง backward-compat สำหรับ API routes เดิมที่เช็คแค่ flag นี้
 * - `userId/tenantId/role` ใช้ใน saas mode + ใช้กำหนด scope ใน portable mode
 *   ใน portable mode: userId='portable-admin', tenantId='default', role='tenant_admin'
 *   ใน saas mode: ค่ามาจาก users table ตอน login
 */
export type Session = {
  admin?: boolean;
  loggedAt?: number;
  userId?: string;
  tenantId?: string;
  role?: Role;
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

/** ใน saas mode: ต้องเป็น super-admin (NULL tenant). ใน portable mode: ไม่ใช้ — return false */
export async function requireSuperAdmin(): Promise<boolean> {
  if (config.app.mode !== 'saas') return false;
  const s = await getSession();
  return !!s.admin && s.role === 'super';
}

/**
 * คืน tenant_id ปัจจุบันจาก session — รับรองว่ามีค่าเสมอเมื่อ session valid
 * portable mode ⇒ DEFAULT_TENANT_ID; saas mode ⇒ จาก session
 */
export async function requireTenantAdmin(): Promise<{ ok: boolean; tenantId: string; role: Role | null }> {
  const s = await getSession();
  if (!s.admin) return { ok: false, tenantId: DEFAULT_TENANT_ID, role: null };
  if (config.app.mode === 'portable') {
    return { ok: true, tenantId: DEFAULT_TENANT_ID, role: 'tenant_admin' };
  }
  // saas mode: super-admin ก็เข้าได้ แต่ tenantId ต้องมาจาก context อื่น (path param) ไม่ใช่ session
  if (s.role === 'tenant_admin' && s.tenantId) {
    return { ok: true, tenantId: s.tenantId, role: 'tenant_admin' };
  }
  if (s.role === 'super') {
    return { ok: true, tenantId: s.tenantId ?? '', role: 'super' };
  }
  return { ok: false, tenantId: '', role: null };
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
