import { NextRequest, NextResponse } from 'next/server';
import { writeServiceAccount, isSetupComplete } from '@/lib/setup';
import { requireAdmin } from '@/lib/auth';
import { resetDriveClient } from '@/lib/drive';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // ครั้งแรก (Setup Wizard) — allow ผ่าน, ครั้งหลัง (admin reset SA) — require admin
  if (isSetupComplete() && !(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'ไม่มีไฟล์แนบมา' }, { status: 400 });
  const text = await file.text();
  try {
    const email = writeServiceAccount(text);
    resetDriveClient();
    return NextResponse.json({ ok: true, clientEmail: email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'อ่านไฟล์ไม่ได้' }, { status: 400 });
  }
}
