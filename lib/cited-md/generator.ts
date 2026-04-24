// cited.md generator (spec §7).
//
// Assembly order matters — §7.2 prescribes:
//   1. Load market card from Redis JSON
//   2. Load evidence chain from Redis Stream (deduped, sorted by confidence)
//   3. Load challenge record from Supabase
//   4. Extract resolver container digest from Chainguard attestation API
//   5. Assemble cited.md string
//   6. sha256 the assembled string EXCLUDING the hash line
//   7. Inject the hash into the attestation block
//   8. Return final string
//
// The hash self-exclusion trick: we assemble with a placeholder, compute the
// hash of the placeholder version, and then substitute the hash. Anyone
// verifying replaces the hash line back with the placeholder, re-hashes, and
// compares. Deterministic.

import { sha256Hex } from '@shared/ids';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type {
  ChallengeRecord,
  CitedMdBundle,
  EvidenceObject,
  MarketCard,
  VerdictObject
} from '@shared/types';
import { resolveAttestation } from '@lib/clients/chainguard';
import { publishCitedMd } from '@lib/clients/ghost';
import { CONFIG } from '@shared/config';

const HASH_PLACEHOLDER = 'sha256:PENDING_SELF_HASH_EXCLUDED_FROM_COMPUTATION';

export interface CitedMdArgs {
  marketId: string;
  verdict: VerdictObject;
  challenge: ChallengeRecord;
}

export async function generateCitedMd(args: CitedMdArgs): Promise<CitedMdBundle> {
  const bus = await getBus();
  const card = await bus.jsonGet<MarketCard>(keys.marketState(args.marketId));
  if (!card) throw new Error(`market not found: ${args.marketId}`);

  const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(args.marketId));
  const evidence = dedupEvidence(
    stream
      .map(s => s.data)
      .filter((e): e is EvidenceObject => typeof (e as EvidenceObject).source_type === 'string')
      .sort((a, b) => b.confidence - a.confidence)
  );

  const attestation = resolveAttestation();

  const body = assembleBody({
    card,
    verdict: args.verdict,
    challenge: args.challenge,
    evidence,
    attestation,
    hash: HASH_PLACEHOLDER
  });

  const hash = 'sha256:' + sha256Hex(body);
  const withHash = body.replace(HASH_PLACEHOLDER, hash);

  return {
    market_id: args.marketId,
    markdown: withHash,
    hash,
    published_at: new Date().toISOString()
  };
}

export async function publishCitedMdForVerdict(args: {
  marketId: string;
  markdown: string;
  hash: string;
  outcome: string;
}): Promise<{ url: string }> {
  const result = await publishCitedMd({
    marketId: args.marketId,
    title: `Oracle resolution — ${args.marketId} (${args.outcome})`,
    markdown: args.markdown,
    hash: args.hash,
    visibility: 'members'
  });
  return { url: result.url };
}

// Given the same URL should be counted once per cycle (§6.3), we dedup here in
// the output layer as a belt-and-braces pass even though the dedup Set in the
// pipeline should have prevented duplicates from entering in the first place.
function dedupEvidence(evidence: EvidenceObject[]): EvidenceObject[] {
  const seen = new Set<string>();
  const out: EvidenceObject[] = [];
  for (const ev of evidence) {
    const key = `${ev.source}::${ev.supports}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

interface AssembleArgs {
  card: MarketCard;
  verdict: VerdictObject;
  challenge: ChallengeRecord;
  evidence: EvidenceObject[];
  attestation: ReturnType<typeof resolveAttestation>;
  hash: string;
}

function assembleBody({ card, verdict, challenge, evidence, attestation, hash }: AssembleArgs): string {
  const lines: string[] = [];
  lines.push('# Oracle Resolution — cited.md');
  lines.push('');

  lines.push('## Market');
  lines.push(`- market_id:       ${card.market_id}`);
  lines.push(`- question:        "${card.question}"`);
  lines.push(`- close_time:      ${card.close_time}`);
  lines.push(`- resolved_at:     ${verdict.resolved_at}`);
  lines.push(`- resolution_cycle: ${verdict.cycle}`);
  lines.push('');

  lines.push('## Verdict');
  lines.push(`- outcome:         ${verdict.outcome}`);
  lines.push(`- confidence:      ${verdict.confidence.toFixed(3)}`);
  lines.push(`- challenge:       ${challengeLabel(challenge)}`);
  lines.push(`- challenger_max_contradiction: ${challenge.max_contradiction_confidence.toFixed(3)}`);
  lines.push('');
  lines.push('### Narrative');
  lines.push('');
  lines.push(verdict.narrative);
  lines.push('');

  lines.push('## Evidence chain');
  lines.push('*(ordered by confidence descending, deduplicated)*');
  lines.push('');
  evidence.forEach((ev, i) => {
    lines.push(`### Source ${i + 1}`);
    lines.push(`- evidence_id:     ${ev.evidence_id}`);
    lines.push(`- url:             ${ev.source}`);
    lines.push(`- source_type:     ${ev.source_type}`);
    lines.push(`- event:           ${ev.event}`);
    lines.push(`- timestamp:       ${ev.timestamp}`);
    lines.push(`- confidence:      ${ev.confidence.toFixed(3)}`);
    lines.push(`- supports:        ${ev.supports}`);
    lines.push(`- fetched_by:      ${ev.fetched_by}`);
    lines.push(`- normalized_by:   ${ev.normalized_by}`);
    lines.push(`- artifact_ref:    ${ev.artifact_ref}`);
    lines.push('');
  });

  lines.push('## Challenge record');
  lines.push(`- challenger_agent:         ${challenge.challenger_agent}`);
  lines.push(`- counter_sources_found:    ${challenge.counter_sources_found}`);
  lines.push(`- max_contradiction_confidence: ${challenge.max_contradiction_confidence.toFixed(3)}`);
  lines.push(`- threshold:                ${challenge.threshold.toFixed(2)}`);
  lines.push(`- result:                   ${challenge.result}`);
  lines.push(`- notes:                    ${challenge.notes}`);
  lines.push(`- ran_at:                   ${challenge.ran_at}`);
  lines.push('');

  lines.push('## Attestation');
  lines.push(`- resolver_image:     ${attestation.image}`);
  lines.push(`- resolver_version:   ${verdict.resolver_agent}`);
  lines.push(`- resolver_digest:    ${attestation.digest}`);
  lines.push(`- sbom_ref:           ${attestation.sbom_ref}`);
  lines.push('- sigstore_verify: |');
  attestation.sigstore_verify_cmd.split('\n').forEach(l => lines.push(`    ${l}`));
  lines.push(`- cited_md_hash:      ${hash}`);
  lines.push(`- published_to:       ${process.env.ORACLE_PUBLIC_URL ?? ''}/cited/${card.market_id}`);
  lines.push(`- stored_in:          ghost.build:cited_md[${card.market_id}]`);
  lines.push(`- published_at:       ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## x402 access');
  lines.push(`- evidence_packet_url:   /api/x402/quote?gate=evidence_unlock&market_id=${card.market_id} (price ${CONFIG.x402.evidenceUnlock} USDC)`);
  lines.push(`- challenge_request_url: /api/x402/quote?gate=challenge_request&market_id=${card.market_id} (price ${CONFIG.x402.challengeRequest} USDC)`);
  lines.push('');

  return lines.join('\n');
}

function challengeLabel(c: ChallengeRecord): string {
  if (c.result === 'VERDICT STANDS') return 'FAILED';
  return c.cycle === 2 ? 'SUCCEEDED_CYCLE_2' : 'SUCCEEDED_CYCLE_1';
}

// Verification helper — anyone can re-derive the hash from a published cited.md.
export function verifyCitedMd(markdown: string): { claimed: string; computed: string; ok: boolean } {
  const match = markdown.match(/cited_md_hash:\s+(sha256:[a-f0-9]+)/);
  if (!match) return { claimed: '', computed: '', ok: false };
  const claimed = match[1];
  const stripped = markdown.replace(claimed, HASH_PLACEHOLDER);
  const computed = 'sha256:' + sha256Hex(stripped);
  return { claimed, computed, ok: claimed === computed };
}
