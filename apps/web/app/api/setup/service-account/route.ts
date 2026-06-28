import { NextRequest, NextResponse } from 'next/server';
import { writeServiceAccount } from '@/lib/setup';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'ไม่มีไฟล์แนบมา' }, { status: 400 });
  const text = await file.text();
  try {
    const email = writeServiceAccount(text);
    return NextResponse.json({ ok: true, clientEmail: email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'อ่านไฟล์ไม่ได้' }, { status: 400 });
  }
}
