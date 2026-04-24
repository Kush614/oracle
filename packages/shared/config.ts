// Oracle runtime config. All values come from env; sensible hackathon defaults.

export const CONFIG = {
  resolveThreshold: Number(process.env.ORACLE_RESOLVE_THRESHOLD ?? 0.85),
  challengeThreshold: Number(process.env.ORACLE_CHALLENGE_THRESHOLD ?? 0.7),
  noConsensusThreshold: Number(process.env.ORACLE_NO_CONSENSUS_THRESHOLD ?? 0.6),
  likelyThreshold: 0.6,
  defaultDeadlineHours: Number(process.env.ORACLE_DEFAULT_DEADLINE_HOURS ?? 4),
  recencyDecayPerHour: 0.2,
  minEvidenceConfidence: 0.3,
  maxSameDomainEvidence: 3,
  maxResolutionCycles: 2,
  reopenWindowMinutes: 30,
  x402: {
    marketCreate: Number(process.env.X402_MARKET_CREATE_PRICE ?? 0.1),
    evidenceUnlock: Number(process.env.X402_EVIDENCE_UNLOCK_PRICE ?? 0.05),
    challengeRequest: Number(process.env.X402_CHALLENGE_PRICE ?? 0.25)
  },
  chainguard: {
    image: process.env.CHAINGUARD_IMAGE ?? 'cgr.dev/oracle/resolver:latest',
    pinnedDigest: process.env.CHAINGUARD_DIGEST ?? ''
  },
  integrationMode(name: string): 'live' | 'fallback' {
    switch (name) {
      case 'redis':
        return process.env.REDIS_URL ? 'live' : 'fallback';
      case 'ghost':
        return process.env.GHOST_DATABASE_URL ? 'live' : 'fallback';
      case 'nexla':
        return process.env.NEXLA_API_URL ? 'live' : 'fallback';
      case 'tinyfish':
        return process.env.TINYFISH_API_KEY ? 'live' : 'fallback';
      case 'guild':
        return process.env.GUILD_API_URL ? 'live' : 'fallback';
      case 'insforge':
        return process.env.INSFORGE_PROJECT_URL && process.env.INSFORGE_API_KEY ? 'live' : 'fallback';
      case 'wundergraph':
        return process.env.WUNDERGRAPH_URL ? 'live' : 'fallback';
      default:
        return 'fallback';
    }
  }
};
