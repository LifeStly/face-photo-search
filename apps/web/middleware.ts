import { NextRequest, NextResponse } from 'next/server';

// Note: middleware runs in edge runtime, can't import fs/Node modules.
// We rely on a runtime cookie set by /api/setup/status (first-load gate).
// Simpler approach: ping /api/setup/status from the root layout (server component) instead.
// For now, just allow everything — gating handled in layout server-side.

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon|api).*)'],
};
