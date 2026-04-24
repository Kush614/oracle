// Deterministic-ish ID helpers. Uses crypto.randomUUID when available so IDs
// survive across process boundaries (MCP, scripts, Next) without collision.

import { randomUUID, createHash } from 'node:crypto';

let counter = 0;

export function newMarketId(): string {
  counter = (counter + 1) % 10_000;
  const stamp = Date.now().toString(36);
  return `oracle_mkt_${stamp}_${counter.toString().padStart(4, '0')}`;
}

export function newEvidenceId(marketId: string, index: number): string {
  return `evd_${marketId.split('_').pop()}_${index.toString().padStart(3, '0')}`;
}

export function newRunId(agent: string): string {
  return `run_${agent}_${randomUUID().slice(0, 8)}`;
}

export function newArtifactRef(prefix: string): string {
  return `artifact_${prefix}_${randomUUID().slice(0, 8)}`;
}

export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
