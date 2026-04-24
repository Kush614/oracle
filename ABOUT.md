# Verity

> The verifiability layer prediction markets deserve.

## Elevator pitch

Verity is the trust layer prediction markets don't have. Instead of UMA-style social-consensus disputes, Verity runs a **five-agent adversarial tournament** for every market — evidence is gathered by **TinyFish's Agent API**, normalized through a **Nexla**-shaped pipeline, deduplicated on a **Redis Cloud** hot bus, aggregated by an **InsForge**-powered resolver, and independently challenged in an isolated **Guild.ai** workspace. Every verdict becomes a **`cited.md`** — a cryptographically signed resolution file with a real **Chainguard** container digest, a published Guild agent SHA, and a sha256 you can verify in three shell commands. Live state (Redis) and resolved records (**Ghost.build** Postgres) are federated through a **WunderGraph Cosmo** router, and three agent actions are gated by **x402** paper micropayments. Seven live sponsors. One canonical artifact. Zero hand-waving.

## About the project

### What inspired this

- **Prediction markets have a resolution crisis.** Polymarket uses UMA's optimistic oracle — anyone proposes an outcome, anyone disputes it. Resolution depends on who shows up, not what the evidence says. Kalshi manually determines outcomes. Augur resolves by token-weighted vote.
- **In every case, nobody outside the system can independently verify why a market resolved the way it did.** There's no audit trail a third party can re-run.
- **I wanted to see if modern agent infra could turn resolution into a governed, reproducible process** — where the output is a file anyone can read, re-derive, and cryptographically verify without trusting me.
- **The artifact matters more than the agent.** If the only thing that survives is a `cited.md` with a real container digest, real published agent SHAs, and a real sha256, the resolver becomes interchangeable. That's what makes it *infrastructure*.

### What I learned

- **Apollo Federation v2 + WunderGraph Cosmo** is startlingly ergonomic — `@key(fields: "id")` on two subgraphs and the router composes them with zero glue code.
- **Chainguard's registry exposes sigstore signature tags at the conventional `sha256-<digest>.sig` path** — you can probe them with a `curl HEAD` and get proof-of-signature without installing `cosign`. That single trick let me embed a real cryptographic anchor in every `cited.md`.
- **Ghost.build is Postgres + the `ghost` CLI** — not a CMS. Getting the name right mid-project meant rewriting an entire client module and migrating the warm-store schema. Once reframed, it became *the* sponsor with the cleanest integration story.
- **TinyFish's Agent API is fast enough for real-time evidence extraction when called in parallel** (~15 s per URL, 3 URLs in parallel = 15 s total per market).
- **Guild.ai's isolation contract is the correct abstraction for adversarial agents.** Modeling Resolver vs. Challenger as two published agents with explicit SHA pinning in `cited.md` means verifiers can re-run the exact prompt — the agent *is* the contract.
- **Hardest realization:** Chainguard's npm library mirror honors a 7-day cooldown, so bleeding-edge package pins can't be immediately mirrored. I solved it with `chainguard_and_upstream` policy + a `.npmrc.chainguard` opt-in rather than forcing the project onto older library versions.

### How I built it

- **24-hour, specification-first.** Before writing code I wrote a 17-section [`spec.md`](./spec.md) defining every field in `cited.md`, every agent's contract, every Redis key family, and every threshold rule.
- **Dual-mode clients everywhere.** Every sponsor wrapper (`lib/clients/*.ts`) has a live path and an in-process fallback. Flipping to live is a single env var per sponsor — no refactors.
- **Five agents modeled as functions, not services.** `lib/agents/*.ts` implements the pipeline in pure TypeScript with **Guild.ai** as the governance layer. The Guild-published agents encode the *contract*; the in-process agents are the reference implementation.
- **Redis hot bus with `globalThis` pinning** to survive Next.js hot-reload in dev without losing market state.
- **`cited.md` generator uses a self-exclusion hash pattern.** The sha256 is computed over the document with the `cited_md_hash` line replaced by a placeholder; then the real hash is injected. Verifiers reverse the substitution to recompute. Deterministic:

$$
\text{hash} = \operatorname{sha256}\bigl(\text{doc} \;\Big|\; \text{hash line} \to \text{placeholder}\bigr)
$$

- **The Odds Adjuster uses tier-weighted, recency-decayed evidence aggregation.** For evidence objects $e_i$ with confidence $c_i$, tier weight $w_{\text{tier}(e_i)} \in \{1.0, 0.85, 0.7, 0.4\}$, and age $h_i$ in hours:

$$
\text{conf}_{\text{YES}} = \frac{\sum_{i : e_i.\text{supports}=\text{YES}} w_{\text{tier}(e_i)} \cdot c_i \cdot \max(0.1,\, 1 - 0.2 h_i)}{\sum_{i} w_{\text{tier}(e_i)} \cdot c_i \cdot \max(0.1,\, 1 - 0.2 h_i)}
$$

A verdict fires when $\text{conf}_{\text{YES}} \geq 0.85$. The Challenger reverses the verdict when contradiction confidence $\geq 0.70$.
- **Cosmo Router runs as a native binary** (`infra/cosmo/bin/router.exe`, 87 MB) downloaded via `wgc router download-binary` — no Docker dependency.
- **Frontend is neo-brutalist** (chunky borders, hard offset shadows, bright accent palette) in an Archivo Black + Inter Tight pairing that contrasts with the usual SaaS-blue dashboard aesthetic.

### Challenges I faced

- **Nexla Express is OAuth-only on the free tier**, and the in-UI Settings page only exposes "Connect MCP" (which registers *outgoing* third-party MCPs) rather than a service-key creator. After multiple rounds of UI exploration I pivoted Nexla to a contract-compatible mock — the normalization function signature is identical, so flipping live is a single env var away once service keys are exposed.
- **pg driver returns `numeric` columns as strings** for precision preservation, which broke `.toFixed()` and `.toLocaleString()` calls across the UI. I added a `coerceNumeric` boundary helper in the Ghost client so numeric columns become real numbers and `timestamptz` columns become ISO strings at the API boundary.
- **Guild's `guild auth login` crashes in non-interactive shells** at the "Select Organization" prompt because stdin closes. Workaround: use the `COSMO_API_KEY`-style env-var path where sponsors expose it; for Guild specifically, the browser OAuth has to happen once in an interactive shell.
- **Cosmo Router binary is Go-based** — no npm analog exists, so I scripted the download via `wgc router download-binary` and gitignored the 87 MB binary to keep the repo lean.
- **LLM nondeterminism in the Challenger.** Cycle 1 sometimes produces a spurious contradiction, triggering a cycle 2 re-run. This is actually *correct* per spec §6.1 — the system is supposed to be paranoid — but it doubled demo time. Mitigated with a tightened goal-prompt and realistic seed URLs so the Agent API returns consistent YES / NO across runs.
- **Windows Git Bash environment quirks** — `nexla.exe` serving the React SPA at `/cli/downloads/nexla_cli_latest.zip` (200 OK HTML, not a zip), `docker` not installed, `redis-cli` absent. Solved each by probing the registry API directly (`curl https://cgr.dev/v2/...`) and using `ioredis` as the `redis-cli` substitute.

## Built with

TypeScript · Next.js 14 (App Router, RSC, `next/font`, route handlers) · React 18 · Node 20 · Tailwind CSS (custom neo-brutalist design system with Archivo Black and Inter Tight) · Apollo Federation v2 · `graphql-yoga` · `pg` (node-postgres) · `ioredis` · Redis 8.4 (RedisJSON, Streams, Sets, TimeSeries modules on Redis Cloud) · Ghost.build (Postgres-for-agents via the `ghost` CLI + `ghost sql`) · TinyFish Agent API (`POST https://agent.tinyfish.ai/v1/automation/run`) + Fetch API fallback · InsForge Chat Completion (`POST /api/ai/chat/completion` with `openai/gpt-4o-mini`) · Chainguard Containers (`cgr.dev/chainguard/node` distroless base) + Chainguard Libraries (opt-in npm mirror via `chainctl`) · Sigstore / cosign (signature discovery via the Docker registry v2 API, `sha256-<digest>.sig` manifest probe) · Guild.ai Agents SDK (`@guildai/agents-sdk`, `@guildai-services/guildai~github`) + Guild CLI agent publishing via `guild agent save --publish` · WunderGraph Cosmo Router 0.311.0 (native Go binary on localhost:3002) + `wgc` CLI for federated graph management · Nexla contract-compatible mock (live path wired for `https://veda-ai.nexla.io/mcp-express/`) · x402 HTTP 402 micropayment gates (paper USDC ledger) · Model Context Protocol (`@modelcontextprotocol/sdk` for the stdio `oracle-mcp` server + MCP-over-HTTP dispatcher at `/api/mcp/[tool]`) · GitHub REST v3 via `gh` CLI · `jsqr` + `jimp` for QR-code decoding during sponsor onboarding · Zod for schema validation · `sha256` via Node's built-in crypto for `cited.md` self-verification · Vercel deployment target. Platforms: Windows 11 + Node 24 + Bash (Git for Windows) + Docker registry v2 API (no Docker daemon required).
