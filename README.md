# Oracle

> **Attested resolution infrastructure for prediction markets.**
> Five adversarial agents. One cryptographically signed `cited.md`. Zero hand-waving.

[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/status-hackathon_demo_ready-FF90E8?style=for-the-badge)](#demo)
[![Sponsors](https://img.shields.io/badge/sponsors-7_live-2AA76E?style=for-the-badge)](#sponsor-integrations)
[![Spec](https://img.shields.io/badge/spec-17_sections-B4ADF5?style=for-the-badge)](./spec.md)

```
      ┌─ TinyFish ─────┐  ┌─ Nexla ───┐  ┌─ Redis ────┐   ┌─ Ghost.build ─┐
      │  Agent API    │→→│  normalize│→→│  hot bus   │   │  warm store   │
      │  browse       │  │           │  │  streams   │   │  cited_md     │
      └───────────────┘  └───────────┘  └──────┬─────┘   └──────┬────────┘
                                               │                │
                                          ┌────▼────────────────▼────┐
                                          │   5-agent tournament     │
                                          │   (Guild.ai governed)    │
                                          │                          │
                                          │   Market Creator         │
                                          │   Evidence Gatherer      │
                                          │   Odds Adjuster          │
                                          │   Resolver  ←→ InsForge  │
                                          │   Challenger (isolated)  │
                                          └────┬─────────────────────┘
                                               │
                                               ▼
                                        cited.md (sha256)
                                      + Chainguard attestation
                                      + Cosmo-federated MarketView
```

---

## The problem

Prediction markets are only as trustworthy as their resolution. The status quo is broken:

| Platform | How it resolves | Who verifies |
|---|---|---|
| **Polymarket** | UMA optimistic oracle — anyone proposes, anyone disputes | Whoever shows up to the dispute wins |
| **Kalshi** | Manual determination by a licensed entity | Nobody externally |
| **Augur** | REP-holder voting | Token-weighted politics |

Resolution becomes a Twitter argument with money on it. Oracle replaces it with a **governed, cryptographically auditable process**.

## The solution

Every market Oracle resolves produces one file: **`cited.md`**. A human-readable, machine-verifiable markdown document with:

- The full evidence chain (every source, every timestamp, every confidence score)
- A challenger record (did any source contradict the verdict?)
- The **Chainguard container digest** that produced it (reproducibility)
- A **Guild.ai published agent SHA** (the prompt contract)
- A `sha256` over the file itself, **computed with the hash line excluded** (tamper-evidence)

Anyone — with nothing but `curl` and `node` — can re-verify any verdict.

```
## Attestation
resolver_image:   cgr.dev/chainguard/node:latest
resolver_digest:  sha256:9e33f02ba42ad1da39f4b6f1b24fe3755127bcdd1b9721dc871863e03cef3c42
resolver_version: kushise27/oracle-resolver@612364ca9c06
sbom_ref:         ghost.build:oracle.sboms/resolver.spdx.json
sigstore_verify: |
  cosign verify cgr.dev/chainguard/node:latest \
    --certificate-identity-regexp='https://github.com/chainguard-images/.+' \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com
cited_md_hash:    sha256:fca36380944a323478f70fbe8986e08ca1b249852ea208ac9f187e1738dfe2e0
```

## Demo

**One-click end-to-end**: open http://localhost:3000 → hit **▶ Run end-to-end demo** → watch the full pipeline fire against live sponsor infrastructure in ~90 seconds.

- [`DEMO.md`](./DEMO.md) — full 5-minute pitch script with timing
- [`spec.md`](./spec.md) — 17-section canonical specification

---

## Sponsor integrations

Seven live, one deliberately mocked. Each row below links to the exact file where the integration is wired.

### ✅ Live

| Sponsor | Role | Proof it's live | Code |
|---|---|---|---|
| **Ghost.build** | Warm Postgres store — resolutions, agent_runs, agent_scores, challenge_records, cited_md | `ghost sql oracle "select count(*) from cited_md"` returns real rows | [`lib/clients/ghost.ts`](./lib/clients/ghost.ts) · [`db/schema.sql`](./db/schema.sql) |
| **TinyFish** | Live web browsing via the Agent API for evidence extraction | Every evidence object has `fetched_by: TinyFish/tinyfish/agent-api/v1` and a real `run_id` | [`lib/clients/tinyfish.ts`](./lib/clients/tinyfish.ts) |
| **InsForge** | `gpt-4o-mini` verdict narrative generation for cited.md | Narrative in Ghost's `resolutions` table includes real InsForge-generated prose | [`lib/clients/insforge.ts`](./lib/clients/insforge.ts) |
| **Chainguard** | Zero-CVE container base + sigstore signature for reproducibility | `cgr.dev/chainguard/node@sha256:9e33f02b…` digest fetched live from registry; signature tag verified to exist | [`lib/clients/chainguard.ts`](./lib/clients/chainguard.ts) · [`infra/chainguard/README.md`](./infra/chainguard/README.md) |
| **Redis Cloud** | Hot bus — RedisJSON for market state, Streams for evidence, Set for dedup, TimeSeries for odds history | 79+ live `oracle:*` keys, all 4 module operations verified | [`lib/redis/bus.ts`](./lib/redis/bus.ts) · [`lib/redis/keys.ts`](./lib/redis/keys.ts) |
| **Guild.ai** | Published Resolver + Challenger agents that Oracle's pipeline attests to | `kushise27/oracle-resolver@612364ca9c06` and `kushise27/oracle-challenger@0874ce03ed37` live in the catalog; SHAs cited in every verdict | [`guild/resolver/agent.ts`](./guild/resolver/agent.ts) · [`guild/challenger/agent.ts`](./guild/challenger/agent.ts) |
| **WunderGraph Cosmo** | Federated GraphQL over hot (Redis) + warm (Ghost) subgraphs | Two subgraphs registered via `wgc`, native router 0.311.0 composes them at `:3002/graphql` | [`infra/cosmo/README.md`](./infra/cosmo/README.md) · [`lib/graphql/`](./lib/graphql/) · [`app/api/graphql/`](./app/api/graphql/) |

### ⚠ Mock (contract-compatible)

| Sponsor | Why mock | How to flip live |
|---|---|---|
| **Nexla** | Express free-tier auth path (service key) not exposed in the current UI shell; OAuth-only via `mcp-express-chatgpt/` plugin | See [`lib/clients/nexla.ts`](./lib/clients/nexla.ts) — live path already wired, just needs `NEXLA_API_URL` + `NEXLA_API_KEY` |

### Bonus — x402

Paper-credit micropayment gates on three agent actions (market create, evidence unlock, challenge request). Implements the HTTP 402 flow without real USDC to stay hackathon-compliant. See [`lib/clients/x402.ts`](./lib/clients/x402.ts) and [`app/api/x402/`](./app/api/x402/).

---

## Deep-dive: how each sponsor is load-bearing

### Ghost.build — the warm store

Every resolved market produces a row in `cited_md`. Every Resolver run lands in `agent_runs`. Every Challenger verdict goes to `challenge_records`. All accessible via:

```bash
ghost sql oracle "select market_id, outcome, confidence, length(markdown) as bytes
                  from cited_md c join resolutions r using (market_id)
                  order by published_at desc limit 5"
```

`lib/clients/ghost.ts` opens a `pg.Pool` against `GHOST_DATABASE_URL` (obtained via `ghost create oracle` + `ghost connect oracle`), and mirrors every write into an in-process map so fallback mode stays contract-compatible. Numeric columns are coerced from pg's string representation to `number` at the boundary so the UI's `.toFixed()` calls stay simple.

### TinyFish — evidence extraction

Oracle's Evidence Gatherer calls `POST https://agent.tinyfish.ai/v1/automation/run` with the market question as the goal. The agent returns structured JSON with `event`, `supports ∈ {YES, NO, NEUTRAL}`, `confidence`, `timestamp` — the exact shape Oracle's evidence stream expects.

```typescript
// lib/clients/tinyfish.ts
const goal = `Determine whether this page provides evidence that the answer
              to the prediction-market question is YES: "${question}".
              Return ONLY a JSON object with keys: event, supports,
              confidence, timestamp.`;
```

Credits burn: ~6 Agent API calls per resolution cycle; well inside a 1,650-credit allotment.

### InsForge — verdict narratives

After the Resolver aggregates evidence and decides the outcome, it calls `POST <INSFORGE_PROJECT_URL>/api/ai/chat/completion` with a structured prompt that references each evidence row by bracket number. The system prompt enforces 3–6 sentences, first-sentence-states-outcome, no speculation beyond the evidence.

Trial project provisioned via `POST https://api.insforge.dev/agents/v1/signup` — claim URL good for 24h, API key valid after claim.

### Chainguard — signed provenance

Oracle's resolver runs on `cgr.dev/chainguard/node:latest` — a zero-CVE distroless image signed via Sigstore. At boot, the Oracle runtime fetches the current digest from the registry via the Docker v2 API (no Docker daemon needed):

```bash
TOKEN=$(curl -s "https://cgr.dev/token?service=cgr.dev&scope=repository:chainguard/node:pull" | jq -r .token)
curl -sI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  "https://cgr.dev/v2/chainguard/node/manifests/latest" \
  | awk -F': ' 'tolower($1)=="docker-content-digest" {print $2}'
```

That digest lands in every cited.md's `resolver_digest` field. The sigstore signature exists at the conventional `:sha256-<digest>.sig` tag — verified in-demo with one `curl`.

### Redis Cloud — hot bus

All eight key families in spec §4.2 are live:

| Key | Type | Purpose |
|---|---|---|
| `oracle:market:<id>:state` | JSON | MarketCard |
| `oracle:market:<id>:events` | Stream | Evidence chain |
| `oracle:market:<id>:orderbook` | JSON | Paper order book |
| `oracle:market:<id>:evidence_dedup` | Set | URL + direction dedup |
| `oracle:market:<id>:challenge_queue` | Stream | Queued verdicts |
| `oracle:market:<id>:odds_ts` | TimeSeries | Live odds history |
| `oracle:agent:<id>:memory` | JSON | Per-agent working state |
| `oracle:markets:index` | Set | Market ID directory |

The bus has a dual mode (`lib/redis/bus.ts`): when `REDIS_URL` is set it speaks ioredis with fallback-tolerant `MODULE` calls; otherwise it runs a pinned `globalThis` in-process implementation so dev hot-reloads don't wipe state.

### Guild.ai — adversarial tournament

Two agents published to the catalog:

- **`kushise27/oracle-resolver@612364ca9c06`** — encodes spec §5.4 + §6.1/§6.2 resolution rules; returns pure JSON verdict
- **`kushise27/oracle-challenger@0874ce03ed37`** — enforces §5.5 isolation contract; sees only the verdict surface, computes contradiction against §6.3 confidence floor

Oracle's in-process pipeline names these exact SHAs in every cited.md. A verifier can `guild agent chat --agent kushise27/oracle-resolver@612364ca9c06 --once < evidence.json` and reproduce the verdict.

### WunderGraph Cosmo — one query, two subgraphs

Hot state (Redis) and warm records (Ghost) are modeled as two Apollo Federation v2 subgraphs extending a shared `Market` entity via `@key(fields: "id")`:

```graphql
# oracle-hot
type Market @key(fields: "id") {
  id: ID!
  question: String!
  oddsYes: Float!
  evidence: [EvidenceEvent!]!
  oddsHistory: [OddsPoint!]!
}

# oracle-warm
extend type Market @key(fields: "id") {
  id: ID! @external
  resolution: Resolution
  challenges: [Challenge!]!
  citedMd: CitedMd
}
```

Both schemas live at `infra/cosmo/schema.*.graphql`. The native Cosmo Router (0.311.0) runs on `:3002` and composes them — one `MarketView` query hits both subgraphs in parallel and returns a unified payload.

```bash
wgc federated-graph create oracle --namespace default --routing-url http://localhost:3002/graphql --label-matcher team=oracle
wgc subgraph publish oracle-hot  --schema infra/cosmo/schema.hot.graphql  --routing-url http://localhost:3000/api/graphql/hot  --label team=oracle
wgc subgraph publish oracle-warm --schema infra/cosmo/schema.warm.graphql --routing-url http://localhost:3000/api/graphql/warm --label team=oracle
```

---

## Quick start

```bash
git clone https://github.com/Kush614/oracle
cd oracle
npm install
npm run dev
```

Open http://localhost:3000 and click **▶ Run end-to-end demo**. That's it — everything runs with in-process fallbacks on first boot.

## Setting up the live stack (≈15 min)

Copy `.env.example` → `.env.local` and fill in any of these you want live. Nothing is required; each block is independent.

### Ghost.build (warm store)

```bash
curl -fsSL https://install.ghost.build/ | sh
ghost login                      # GitHub OAuth
ghost create oracle --wait       # provisions a Postgres instance
ghost sql oracle < db/schema.sql # apply Oracle's schema
ghost connect oracle             # prints postgres://… — paste into GHOST_DATABASE_URL
```

### TinyFish (evidence extraction)

```bash
# Grab a key — 1,650 free credits via the hackathon QR code
# https://agent.tinyfish.ai/makeasplash?source=agenticengg
echo "TINYFISH_API_KEY=sk-tinyfish-..." >> .env.local
```

### InsForge (verdict narratives)

```bash
curl -X POST https://api.insforge.dev/agents/v1/signup \
  -H 'content-type: application/json' \
  -d '{"projectName":"oracle"}'
# response includes accessApiKey + projectUrl — paste into .env.local
```

Claim within 24h at the returned claim URL.

### Chainguard (signed container)

```bash
# Pull the current chainguard/node digest programmatically
TOKEN=$(curl -s "https://cgr.dev/token?service=cgr.dev&scope=repository:chainguard/node:pull" | jq -r .token)
DIGEST=$(curl -sI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  "https://cgr.dev/v2/chainguard/node/manifests/latest" \
  | awk -F': ' 'tolower($1)=="docker-content-digest" {print $2}' | tr -d '\r')
echo "CHAINGUARD_DIGEST=$DIGEST" >> .env.local
```

### Redis Cloud (hot bus)

Sign up at https://app.redislabs.com → create a free 30MB database → enable modules **RedisJSON** and **RedisTimeSeries** → copy the connection URL to `REDIS_URL`.

### Guild.ai (catalog attestation)

```bash
npm install -g @guildai/cli
guild auth login --no-browser
guild setup
guild workspace select home
cd guild/resolver && guild agent save --publish
cd ../challenger && guild agent save --publish
# Grab the version SHAs from the output and set:
echo "GUILD_RESOLVER_AGENT_ID=<your-namespace>/oracle-resolver@<sha>" >> .env.local
echo "GUILD_CHALLENGER_AGENT_ID=<your-namespace>/oracle-challenger@<sha>" >> .env.local
```

### WunderGraph Cosmo (federated router)

```bash
npm install -g wgc@latest
wgc auth login                                   # browser OAuth
export COSMO_API_KEY=cosmo_...                   # from cosmo.wundergraph.com/<org>/apikeys
wgc federated-graph create oracle --namespace default \
  --routing-url http://localhost:3002/graphql --label-matcher team=oracle
wgc subgraph publish oracle-hot  --schema infra/cosmo/schema.hot.graphql  \
  --routing-url http://localhost:3000/api/graphql/hot  --label team=oracle --namespace default
wgc subgraph publish oracle-warm --schema infra/cosmo/schema.warm.graphql \
  --routing-url http://localhost:3000/api/graphql/warm --label team=oracle --namespace default
TOKEN=$(wgc router token create oracle-local --graph-name oracle --namespace default | awk '/^ey/{print;exit}')
wgc router download-binary -o infra/cosmo/bin
GRAPH_API_TOKEN=$TOKEN FEDERATED_GRAPH_NAME=oracle LISTEN_ADDR=localhost:3002 DEV_MODE=true \
  infra/cosmo/bin/router.exe
echo "WUNDERGRAPH_URL=http://localhost:3002/graphql" >> .env.local
```

---

## Verifying a verdict yourself

Anyone can re-derive a cited.md's hash and confirm its Chainguard signature — no credentials required.

```bash
# 1. Pull the cited.md from Ghost (or the public /cited/:id page)
MARKET=oracle_mkt_abc_0001
curl -s "http://localhost:3000/api/markets/$MARKET/cited" | jq -r .markdown > cited.md

# 2. Re-compute the hash (exclude the cited_md_hash line itself)
CLAIMED=$(grep 'cited_md_hash' cited.md | awk '{print $2}')
sed -i "s|$CLAIMED|sha256:PENDING_SELF_HASH_EXCLUDED_FROM_COMPUTATION|" cited.md
COMPUTED=sha256:$(sha256sum cited.md | awk '{print $1}')
[ "$CLAIMED" = "$COMPUTED" ] && echo "✓ cited.md verified" || echo "✗ tampered"

# 3. Verify the Chainguard signature tag exists
DIGEST=$(grep 'resolver_digest' cited.md | awk '{print $2}' | sed 's/sha256://')
TOKEN=$(curl -s "https://cgr.dev/token?service=cgr.dev&scope=repository:chainguard/node:pull" | jq -r .token)
curl -sI -H "Authorization: Bearer $TOKEN" \
  "https://cgr.dev/v2/chainguard/node/manifests/sha256-$DIGEST.sig" | head -1
# → HTTP/2 200 means the signature exists on the registry
```

That's the whole trust contract. Three shell commands.

---

## Repository layout

```
oracle/
├── app/                          Next.js 14 App Router
│   ├── page.tsx                  Dashboard — hero, sponsor marquee, market list
│   ├── market/[marketId]/        Live market detail — odds, evidence, cited.md
│   ├── cited/[marketId]/         Public cited.md viewer with sha256 verification
│   ├── audit/                    Full agent_runs / challenges / resolutions log
│   ├── new/                      Create market form (x402 gated)
│   └── api/
│       ├── markets/              Market CRUD + per-market resolve, evidence, challenge
│       ├── graphql/hot           Apollo Federation v2 subgraph — Redis-backed
│       ├── graphql/warm          Apollo Federation v2 subgraph — Ghost-backed
│       ├── x402/                 HTTP 402 micropayment gates
│       ├── mcp/[tool]            MCP-over-HTTP dispatcher
│       └── seed/                 Demo market seeder
├── components/
│   ├── Navbar.tsx                Persistent top nav
│   └── dashboard/                MarketCardView, OddsSparkline, EvidenceStream,
│                                 CitedMdPanel, QuickDemo, RecentResolutions,
│                                 SponsorMarquee, AgentLeaderboard, …
├── lib/
│   ├── agents/                   Five-agent pipeline (spec §5)
│   │   ├── market-creator.ts
│   │   ├── evidence-gatherer.ts
│   │   ├── odds-adjuster.ts
│   │   ├── resolver.ts
│   │   ├── challenger.ts
│   │   └── pipeline.ts
│   ├── clients/                  Sponsor SDK wrappers (live + fallback modes)
│   │   ├── ghost.ts              Ghost.build Postgres
│   │   ├── tinyfish.ts           Agent API + Fetch API
│   │   ├── insforge.ts           Chat completion + paper ledger
│   │   ├── chainguard.ts         Registry digest + sigstore cmd
│   │   ├── wundergraph.ts        Cosmo Router federated reads
│   │   ├── guild.ts              Sealed-workspace governance
│   │   ├── nexla.ts              Evidence normalization contract
│   │   └── x402.ts               Paper payment gates
│   ├── cited-md/
│   │   └── generator.ts          Assemble + hash + publish cited.md
│   ├── graphql/
│   │   ├── hot-subgraph.ts       Federation v2 — Market + Evidence
│   │   └── warm-subgraph.ts      Federation v2 — Resolution + Challenge + CitedMd
│   └── redis/
│       ├── bus.ts                JSON / Streams / Set / TimeSeries (dual-mode)
│       └── keys.ts               Canonical key families
├── guild/
│   ├── resolver/                 oracle-resolver published agent source
│   └── challenger/               oracle-challenger published agent source
├── mcp/
│   ├── server.ts                 Stdio MCP server (oracle-mcp)
│   └── README.md
├── infra/
│   ├── Dockerfile.resolver       Chainguard distroless base
│   ├── chainguard/README.md      Container + Libraries setup
│   ├── cosmo/
│   │   ├── schema.hot.graphql    Subgraph schemas for wgc publish
│   │   ├── schema.warm.graphql
│   │   └── README.md
│   └── attest.ts                 CI-time attestation emitter
├── packages/shared/              Types, ids, config
├── db/
│   └── schema.sql                Warm-store DDL (runs on Ghost.build)
├── scripts/
│   ├── seed-demo-markets.ts      npm run seed
│   ├── tick.ts                   One-pass evidence refresh (cron-friendly)
│   └── smoke-test.ts             End-to-end CI check
├── DEMO.md                       5-minute pitch script with timings
├── spec.md                       17-section canonical specification
└── README.md                     ← you are here
```

## Scripts

```bash
npm run dev            # dashboard + API on :3000
npm run smoke          # PASS/FAIL end-to-end check (hits live sponsors)
npm run seed           # 3 markets, first pre-resolved
npm run tick           # one evidence refresh pass across open markets
npm run typecheck      # tsc --noEmit
npm run mcp            # launch oracle-mcp stdio (for Claude Desktop)
npm run attest         # emit Chainguard attestation block
npm run ghost:schema   # apply db/schema.sql to the ghost oracle database
```

## Spec

The project was built to [`spec.md`](./spec.md), a 17-section specification covering:

1. Executive summary and thesis
2. Problem statement and failure modes
3. Core concepts (adversarial loop, cited.md, paper markets)
4. Architecture (hot / warm / cold tiers)
5. Five-agent specifications (Market Creator through Challenger)
6. Resolution rules (confidence thresholds, tier weights, deduplication)
7. cited.md format (exact field-by-field contract)
8. Sponsor integrations (what each one does)
9. Data flow (full resolution lifecycle)
10. MCP interface (eight tools)
11. TinyFish dashboard panels
12. Security model (Chainguard attestation, x402, access control)
13. 24-hour build plan
14. Demo script
15. Repository structure
16. Non-goals
17. Glossary

Both the 17-section spec and the 5-minute [DEMO.md](./DEMO.md) are committed.

## License

MIT. See [LICENSE](./LICENSE). Seven sponsor integrations, zero mock-only dependencies (Nexla carries a contract-compatible mock; the live path is wired and one env var away).

---

*Oracle is not a prediction market app. Oracle is the trust layer prediction markets don't have.*
