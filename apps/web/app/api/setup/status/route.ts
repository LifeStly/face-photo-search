import { NextResponse } from 'next/server';
import { isSetupComplete, readSetup } from '@/lib/setup';
import { hasAnySuperAdmin } from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import { config } from '@/lib/config';

export async function GET() {
  const setup = readSetup();
  const hasServiceAccount = fs.existsSync(config.drive.credentialsPath);
  const pw = process.env.ADMIN_PASSWORD ?? '';
  return NextResponse.json({
    mode: config.app.mode,
    complete: isSetupComplete(),
    hasServiceAccount,
    hasPassword: !!pw && pw !== 'changeme',
    hasSuperAdmin: config.app.mode === 'saas' ? hasAnySuperAdmin() : false,
    driveFolderId: setup?.driveFolderId ?? config.drive.defaultFolderId ?? '',
    driveFolderName: setup?.driveFolderName ?? '',
  });
}
