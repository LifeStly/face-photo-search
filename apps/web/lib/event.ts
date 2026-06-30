import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEventCode, latestRunIdForFolder, db } from './db';
import { isEventAuthed } from './auth';

const CODE_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateEventCode(len = 8): string {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

/**
 * รับรองว่า folder มี event code (สำหรับ QR) — reuse ของเดิมถ้ามี, สร้างใหม่แบบ public ถ้ายังไม่มี
 * ใช้ตอน auto-enable QR เมื่อ folder เปลี่ยนเป็น Live
 */
export function ensureEventCodeForFolder(folderId: string): { code: string; created: boolean } {
  const existing = db()
    .prepare(`SELECT code FROM event_codes WHERE folder_id=?`)
    .get(folderId) as { code: string } | undefined;
  if (existing) return { code: existing.code, created: false };

  for (let i = 0; i < 5; i++) {
    const c = generateEventCode();
    if (!getEventCode(c)) {
      db()
        .prepare(`INSERT INTO event_codes (code, folder_id, password_hash, created_at) VALUES (?, ?, ?, ?)`)
        .run(c, folderId, null, Date.now());
      return { code: c, created: true };
    }
  }
  throw new Error('failed to generate unique event code');
}

export type EventAccess = {
  code: string;
  folderId: string;
  runId: number;
};

export type EventGateResult =
  | { ok: true; access: EventAccess }
  | { ok: false; status: number; error: string };

/**
 * verify ว่า user เข้าถึง event นี้ได้: code valid + auth ผ่าน + folder มี run
 * คืน access info ถ้าผ่าน หรือ NextResponse error ถ้าไม่
 */
export async function gateEvent(code: string): Promise<EventGateResult> {
  const ev = getEventCode(code);
  if (!ev) return { ok: false, status: 404, error: 'invalid code' };

  const authed = await isEventAuthed(code);
  if (!authed) return { ok: false, status: 401, error: 'auth required' };

  const runId = latestRunIdForFolder(ev.folder_id);
  if (!runId) return { ok: false, status: 404, error: 'no data for this event' };

  return { ok: true, access: { code, folderId: ev.folder_id, runId } };
}

/**
 * เช็คว่า photoId เป็นของ event นี้จริง (run_id ตรง)
 */
export function photoBelongsToEvent(photoId: string, runId: number): boolean {
  const row = db().prepare(`SELECT 1 FROM photos WHERE id=? AND run_id=?`).get(photoId, runId);
  return !!row;
}

export function gateError(r: Extract<EventGateResult, { ok: false }>) {
  return NextResponse.json({ error: r.error }, { status: r.status });
}
