import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId } from '@/lib/tenant';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * เริ่ม Google OAuth flow สำหรับ tenant ปัจจุบัน
 * - ต้องมี GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI (server config)
 * - บน production ต้อง HTTPS (Google policy)
 * - state = base64(json({tenantId, nonce})) — ใช้ตรวจใน callback
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (config.app.mode !== 'saas') {
    return NextResponse.json({ error: 'OAuth available in saas mode only' }, { status: 400 });
  }
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({
      error: 'GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI not configured on server',
    }, { status: 500 });
  }
  // HTTPS guard — ยกเว้น localhost (Google policy)
  if (!redirectUri.startsWith('https://') && !redirectUri.includes('localhost')) {
    return NextResponse.json({ error: 'OAuth redirect URI ต้องเป็น https:// (เว้น localhost)' }, { status: 500 });
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const state = Buffer.from(JSON.stringify({
    tenantId,
    nonce: crypto.randomBytes(8).toString('hex'),
  })).toString('base64url');

  const url = oauth2.generateAuthUrl({
    access_type: 'offline',         // ขอ refresh_token
    prompt: 'consent',              // บังคับขอใหม่ทุกครั้งกัน refresh_token หาย
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    state,
  });
  return NextResponse.redirect(url);
}
