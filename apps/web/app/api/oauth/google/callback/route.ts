import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { config } from '@/lib/config';
import { upsertDriveSource, logAudit, getTenant } from '@/lib/tenant';
import { resetTenantDriveClient } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Google OAuth callback — แลก code → tokens, บันทึกลง drive_sources
 * state มี tenantId — ใช้ระบุว่า OAuth นี้ผูกกับ tenant ไหน
 */
export async function GET(req: NextRequest) {
  if (config.app.mode !== 'saas') {
    return NextResponse.json({ error: 'OAuth available in saas mode only' }, { status: 400 });
  }
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return NextResponse.redirect(new URL(`/admin?oauth=error&reason=${encodeURIComponent(oauthError)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code/state' }, { status: 400 });
  }

  let tenantId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    tenantId = String(decoded.tenantId);
  } catch {
    return NextResponse.json({ error: 'invalid state' }, { status: 400 });
  }
  if (!getTenant(tenantId)) {
    return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
  try {
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      // ไม่มี refresh_token = เคย consent แล้วและ Google ไม่ส่งให้อีก
      // ทางแก้: ต้องเข้า https://myaccount.google.com/permissions แล้วลบสิทธิ์ก่อน หรือใช้ prompt=consent (เราใช้แล้ว)
      return NextResponse.redirect(new URL('/admin?oauth=error&reason=no_refresh_token', req.url));
    }
    upsertDriveSource({
      tenantId,
      type: 'oauth',
      oauthTokensJson: JSON.stringify(tokens),
    });
    resetTenantDriveClient(tenantId);
    logAudit({ tenantId, action: 'drive_source_oauth_connect' });
    return NextResponse.redirect(new URL('/admin?oauth=ok', req.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/admin?oauth=error&reason=${encodeURIComponent(e?.message ?? 'token_exchange_failed')}`, req.url));
  }
}
