import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId, getDriveSourceForTenant, upsertDriveSource, logAudit } from '@/lib/tenant';
import { config } from '@/lib/config';
import { resetDriveClient, resetTenantDriveClient } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const src = getDriveSourceForTenant(tenantId);
  if (!src) return NextResponse.json({ source: null });

  let saEmail: string | null = null;
  if (src.type === 'sa' && src.sa_file_path && fs.existsSync(src.sa_file_path)) {
    try {
      saEmail = JSON.parse(fs.readFileSync(src.sa_file_path, 'utf8')).client_email ?? null;
    } catch {}
  }
  return NextResponse.json({
    source: {
      type: src.type,
      folderId: src.folder_id,
      updatedAt: src.updated_at,
      saEmail,
      hasOAuth: src.type === 'oauth' && !!src.oauth_tokens_json,
    },
  });
}

/**
 * Upload Service Account JSON สำหรับ tenant ปัจจุบัน
 * multipart: file = service-account JSON
 * บันทึกที่ secrets/tenants/<tenantId>/service-account.json
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'missing file' }, { status: 400 });

  const jsonText = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return NextResponse.json({ error: 'ไฟล์ไม่ใช่ JSON ที่ valid' }, { status: 400 });
  }
  if (!parsed.client_email || !parsed.private_key) {
    return NextResponse.json({ error: 'ไม่ใช่ Google Service Account key (ต้องมี client_email + private_key)' }, { status: 400 });
  }

  const dir = path.join(config.paths.secretsDir, 'tenants', tenantId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const saPath = path.join(dir, 'service-account.json');
  fs.writeFileSync(saPath, jsonText, 'utf8');

  upsertDriveSource({ tenantId, type: 'sa', saFilePath: saPath });
  resetTenantDriveClient(tenantId);
  resetDriveClient(); // กรณี portable
  logAudit({ tenantId, action: 'drive_source_sa_upload', meta: { email: parsed.client_email } });
  return NextResponse.json({ ok: true, saEmail: parsed.client_email });
}
