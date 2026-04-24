import { NextResponse } from 'next/server';
import { listResolutions } from '@lib/clients/ghost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const resolutions = await listResolutions();
  return NextResponse.json({ resolutions });
}
