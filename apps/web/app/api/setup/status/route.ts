import { NextResponse } from 'next/server';
import { isSetupComplete, readSetup } from '@/lib/setup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import { config } from '@/lib/config';

export async function GET() {
  const setup = readSetup();
  const hasServiceAccount = fs.existsSync(config.drive.credentialsPath);
  const pw = process.env.ADMIN_PASSWORD ?? '';
  return NextResponse.json({
    complete: isSetupComplete(),
    hasServiceAccount,
    hasPassword: !!pw && pw !== 'changeme',
    driveFolderId: setup?.driveFolderId ?? config.drive.defaultFolderId ?? '',
    driveFolderName: setup?.driveFolderName ?? '',
  });
}
