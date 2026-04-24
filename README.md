# Oracle

**Attested resolution infrastructure for prediction markets.**

Five agents compete to produce, challenge, and cryptographically attest every verdict. Every resolved market
produces a `cited.md` — human-readable, sha256-anchored, signed by a Chainguard-attested resolver container.

Full spec in [`spec.md`](./spec.md).

---

## Quick start (local, zero credentials)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Seed demo markets**. You'll see:

1. Three markets appear (Nexla normalizes three candidate events into MarketCards in Redis JSON)
2. Evidence arrives via the TinyFish browser (fallback fixtures for the demo)
3. Odds climb as the Odds Adjuster applies tier-weighted confidence
4. The Resolver produces a verdict; the Challenger independently probes contradictions
5. `cited.md` is published and its sha256 verified in the panel

No Redis, Supabase, Ghost, Guild.ai, TinyFish, Nexla, InsForge, or Wundergraph account is required to run
the demo end-to-end. Every integration has a drop-in fallback.

## Running with live sponsors

Fill in `.env.example` → `.env.local`. Any filled block switches that sponsor to live mode automatically —
each client detects its env variable and swaps in the HTTP path.

| Env var set | Client switches to live |
|---|---|
| `REDIS_URL` | ioredis with RedisJSON/Streams/TimeSeries commands |
| `GHOST_DATABASE_URL` | Ghost.build Postgres warm store (resolutions, agent_runs, cited_md, …) |
| `TINYFISH_API_KEY` | TinyFish Agent API for live evidence extraction |
| `INSFORGE_PROJECT_URL` + `INSFORGE_API_KEY` | InsForge chat-completion verdict narratives |
| `NEXLA_API_URL` + `NEXLA_API_KEY` | Nexla evidence normalization pipeline |
| `GUILD_API_URL` + `GUILD_API_KEY` + `GUILD_WORKSPACE_ID` | Guild.ai governed run posting |
| `WUNDERGRAPH_URL` | Cosmo Router federated-graph endpoint |
| `CHAINGUARD_DIGEST` | Real sigstore-signed resolver image digest embedded in cited.md |

See [`infra/chainguard/README.md`](./infra/chainguard/README.md) for the Chainguard
container + libraries setup (containers live by default; libraries opt-in).
See [`infra/cosmo/README.md`](./infra/cosmo/README.md) for publishing the two
subgraphs with `wgc`.

## Ghost.build — warm Postgres store

Ghost is "the first database built for agents" — unlimited Postgres instances you create, fork, and discard
freely. In Oracle, Ghost owns everything that needs to survive a restart: resolutions, agent runs, agent
scores, challenge records, and the **`cited_md` table** where every resolved market's full markdown + sha256
is stored.

Setup:

```bash
curl -fsSL https://install.ghost.build/ | sh
ghost login                    # GitHub OAuth
ghost create oracle            # creates a Postgres instance
ghost sql oracle -f db/schema.sql
ghost connect oracle           # prints the connection string
```

Paste the connection string into `.env.local` as `GHOST_DATABASE_URL`. The app picks it up on next request.

Optional: `ghost mcp install` gives Claude direct `ghost_sql` access to the same database — useful for
inspecting Oracle's warm store from Claude during the demo.

## Repo layout

Mirrors spec §15 with a slightly flattened top level for hackathon simplicity:

```
oracle/
  app/                           Next.js 14 App Router
    api/
      markets/                   CRUD + per-market resolve, evidence, challenge, cited
      resolutions/               history
      agents/scores/             Guild.ai leaderboard
      x402/                      HTTP 402 micropayment gates (quote + pay)
      mcp/[tool]/                MCP-over-HTTP dispatcher
      seed/                      /api/seed → autoCreateFromFeeds
    new/                         market creation UI
    market/[marketId]/           market detail
    audit/                       full audit log
  components/dashboard/          MarketCardView, OddsSparkline, EvidenceStream,
                                 AgentLeaderboard, CitedMdPanel, …
  lib/
    agents/                      market-creator, evidence-gatherer,
                                 odds-adjuster, resolver, challenger, pipeline
    clients/                     tinyfish, nexla, ghost, insforge,
                                 wundergraph, supabase, guild, chainguard, x402
    cited-md/                    generator + verifier (sha256 self-exclusion)
    redis/                       bus.ts (ioredis + in-memory fallback) + keys.ts
  mcp/                           oracle-mcp stdio server
  packages/shared/               types, ids, config
  infra/                         Chainguard Dockerfile, SBOM, cosign verify script
  db/schema.sql                  warm store DDL (runs on Ghost.build Postgres)
  scripts/                       seed-demo-markets.ts, tick.ts, smoke-test.ts
  spec.md                        canonical brief
```

## Useful scripts

```bash
npm run dev        # Next.js dashboard + API on :3000
npm run seed       # Create 3 markets + pre-resolve one
npm run tick       # One pass of gather+odds on every open market
npm run mcp        # Launch oracle-mcp stdio (for Claude Desktop)
npm run attest     # Emit Chainguard attestation block for current build
npm run typecheck  # tsc --noEmit
```

## Demo script (3 minutes)

See spec §14. TL;DR:

1. Open dashboard, click **Seed demo markets**
2. Click into the GitHub release market, click **Gather evidence** twice to watch odds climb
3. Click **Run full pipeline** — Resolver + Challenger fire; cited.md appears
4. In terminal: `npm run attest` prints the Chainguard attestation block
5. Show `cosign verify` line inside cited.md — panel confirms sha256 self-hash verifies

## MCP integration

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "oracle": {
      "command": "npx",
      "args": ["-y", "tsx", "E:/shipprod/mcp/server.ts"],
      "env": { "ORACLE_API_URL": "http://localhost:3000" }
    }
  }
}
```

Then in Claude: "list oracle markets", "resolve market oracle_mkt_…", "fetch cited.md for …".
