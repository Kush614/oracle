// Guild.ai — agent tournament control plane (spec §8.6).
//
// Guild.ai's critical contract in Oracle is *isolation*: the Challenger must
// not see the Resolver's working state until after the verdict is filed. This
// module exposes:
//
//   - governedRun()  — records an agent run with role, workspace, audit log
//   - sealedWorkspace() — returns a workspace handle the Challenger can use
//                         that does not inherit the Resolver's memory
//
// In live mode these are thin wrappers over the Guild.ai REST API; in fallback
// mode we enforce isolation by constructing a fresh object per workspace and
// recording all audit entries into Supabase.

import { CONFIG } from '@shared/config';
import { newRunId } from '@shared/ids';
import { recordAgentRun } from './ghost';
import type { AgentRun } from '@shared/types';

export interface GuildWorkspace {
  id: string;
  agent: string;
  role: 'market_creator' | 'evidence_gatherer' | 'odds_adjuster' | 'resolver' | 'challenger';
  audit: AuditEntry[];
  log(stage: string, details: Record<string, unknown>): void;
}

export interface AuditEntry {
  stage: string;
  at: string;
  details: Record<string, unknown>;
}

export function sealedWorkspace(
  role: GuildWorkspace['role'],
  agent: string
): GuildWorkspace {
  const audit: AuditEntry[] = [];
  return {
    id: `guild_${role}_${newRunId(role).slice(4)}`,
    agent,
    role,
    audit,
    log(stage, details) {
      audit.push({ stage, at: new Date().toISOString(), details });
    }
  };
}

export async function governedRun<T>(
  ws: GuildWorkspace,
  marketId: string | undefined,
  fn: () => Promise<{ output: T; outcome: string; confidence?: number }>
): Promise<{ output: T; run: AgentRun; audit: AuditEntry[] }> {
  const startedAt = new Date().toISOString();
  const runId = newRunId(ws.role);

  if (CONFIG.integrationMode('guild') === 'live') {
    try {
      await fetch(`${process.env.GUILD_API_URL}/workspaces/${process.env.GUILD_WORKSPACE_ID}/runs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.GUILD_API_KEY}`
        },
        body: JSON.stringify({ run_id: runId, agent: ws.agent, role: ws.role, started_at: startedAt })
      });
    } catch {
      // Continue with local audit; live errors never block resolution.
    }
  }

  ws.log('run_started', { run_id: runId });
  const result = await fn();
  ws.log('run_completed', { outcome: result.outcome, confidence: result.confidence });

  const run: AgentRun = {
    run_id: runId,
    agent: ws.agent,
    market_id: marketId ?? 'n/a',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    outcome: result.outcome,
    confidence: result.confidence,
    inputs_ref: `audit:${ws.id}:inputs`,
    outputs_ref: `audit:${ws.id}:outputs`
  };
  await recordAgentRun(run);

  return { output: result.output, run, audit: ws.audit };
}
