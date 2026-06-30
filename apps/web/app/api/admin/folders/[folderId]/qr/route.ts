import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, getEventCode } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/tenant';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// short code 8 ตัว (a-z A-Z 0-9) — เก็บอ่านง่ายใน QR
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(len = 8): string {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/**
 * เปิด/อัพเดท QR ของ folder
 * body: { password?: string | null }
 *   - password = null/'' → public (ไม่มีรหัส)
 *   - password = 'xxx'   → hash + เก็บ
 *
 * ถ้ายังไม่มี code ของ folder นี้ → generate ใหม่
 * ถ้ามีแล้ว → reuse code (ไม่ rotate) แต่ update password_hash
 */
export async function POST(req: NextRequest, { params }: { params: { folderId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const folderId = decodeURIComponent(params.folderId);
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const rawPassword: string | null = typeof body.password === 'string' && body.password.length > 0 ? body.password : null;
  const passwordHash = rawPassword ? bcrypt.hashSync(rawPassword, 10) : null;

  const existing = db().prepare(`SELECT code FROM event_codes WHERE tenant_id=? AND folder_id=?`).get(tenantId, folderId) as { code: string } | undefined;
  let code: string;
  if (existing) {
    code = existing.code;
    db().prepare(`UPDATE event_codes SET password_hash=? WHERE code=?`).run(passwordHash, code);
  } else {
    for (let i = 0; i < 5; i++) {
      const c = generateCode();
      if (!getEventCode(c)) {
        code = c;
        db().prepare(`INSERT INTO event_codes (code, folder_id, password_hash, created_at, tenant_id) VALUES (?, ?, ?, ?, ?)`)
          .run(code, folderId, passwordHash, Date.now(), tenantId);
        break;
      }
    }
    if (!code!) return NextResponse.json({ error: 'failed to generate unique code' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code, hasPassword: !!passwordHash });
}

/**
 * ปิด QR — ลบ event code ของ folder นี้
 */
export async function DELETE(_req: NextRequest, { params }: { params: { folderId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const folderId = decodeURIComponent(params.folderId);
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const r = db().prepare(`DELETE FROM event_codes WHERE tenant_id=? AND folder_id=?`).run(tenantId, folderId);
  return NextResponse.json({ ok: true, removed: r.changes });
}
