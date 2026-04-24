import { NextResponse } from 'next/server';
import { agentLeaderboard } from '@lib/clients/wundergraph';
import { listAgentRuns } from '@lib/clients/ghost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [scores, runs] = await Promise.all([agentLeaderboard(), listAgentRuns()]);
  return NextResponse.json({ scores, runs: runs.slice(0, 50) });
}
