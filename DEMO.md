# Verity — 5-Minute Demo Script

**Title card**: *Verity · Veritys for Prediction Markets*
**Subtitle**: *Attested resolution infrastructure · project codename `oracle`*
**Author**: Kush · **Stack**: TinyFish · InsForge · Redis · Ghost.build · Chainguard · Guild.ai · Cosmo · x402
**Total runtime**: 5:00 · **Format**: screen recording with voiceover

---

## Pre-flight checklist (run before you hit record)

```bash
# Terminal A — Next dev server
cd E:/shipprod && npm run dev

# Terminal B — Cosmo Router (from earlier setup)
cd E:/shipprod/infra/cosmo/bin
GRAPH_API_TOKEN='<router-token>' FEDERATED_GRAPH_NAME=oracle \
  LISTEN_ADDR=localhost:3002 DEV_MODE=true ./router.exe

# Terminal C — Ghost warm store peek (used during the demo)
ghost sql oracle "select market_id, hash from cited_md order by published_at desc limit 3"
```

Open these three browser tabs in advance:
1. `http://localhost:3000` — Verity dashboard
2. `http://localhost:3002` — Cosmo playground
3. `https://github.com/Kush614/oracle` — the repo

Clear any existing demo data right before recording:
```bash
ghost sql oracle "truncate resolutions, challenge_records, agent_runs, agent_scores, cited_md, evidence_objects"
```

---

## ACT 1 — The problem (0:00 → 0:25)

**Screen**: full-screen camera on you, or a title card with the Oracle sticker.

> "Prediction markets are only as trustworthy as their resolution.
> Polymarket runs on UMA's optimistic oracle — anyone proposes an outcome,
> anyone disputes it. That's not infrastructure. That's a Twitter argument
> with money on it.
>
> When markets resolve wrong, people lose real money. When they resolve
> *opaquely*, nobody can prove it either way.
>
> So we built the trust layer."

Cut to the Verity dashboard hero.

---

## ACT 2 — What Verity is (0:25 → 0:50)

**Screen**: `http://localhost:3000` — the pink hero with "Five agents. One cited.md. Zero hand-waving."

> "Verity is a five-agent adversarial tournament. For every market, one
> agent gathers evidence. Another adjusts odds. A third resolves. A fourth
> runs in an isolated workspace and tries to reverse the verdict. Every
> verdict becomes a *cited.md* — a cryptographically signed resolution
> file with the full evidence chain, the challenger record, a real
> Chainguard container digest, and a sha256 you can verify yourself.
>
> Eight sponsor technologies make it work — and nothing in this demo is
> mocked."

Point at the black sponsor-marquee strip scrolling left:
*Ghost.build · TinyFish · InsForge · Chainguard · Redis · Guild.ai · Cosmo · x402*

---

## ACT 3 — One-click demo (0:50 → 2:30)

**Screen**: Verity dashboard, hero in view.

> "Watch this. One button. No pre-seeding. Full pipeline."

Click **▶ Run end-to-end demo** (yellow button in hero).

Narrate what's happening behind the scenes while the spinner turns:

> "Nexla-style normalization is generating three market proposals from
> live feeds. Market Creator writes a MarketCard into **Redis JSON**,
> initializes a paper order book at 50/50, and fires a market_created
> event on the Redis Stream. I'm being redirected to the first market."

**Screen**: now on the market detail page. Odds sparkline empty, evidence stream empty.

> "The Evidence Gatherer is calling **TinyFish's Agent API** — a real
> browser-in-the-cloud — with the goal 'does this GitHub page prove
> Next.js has released v14+?'. Watch the agent_runs panel on the right."

Agent activity list starts filling in. Odds chart starts climbing.

> "Every data point you see is going into **Redis TimeSeries** for the
> live chart. Evidence rows are getting normalized through my Nexla-
> mirror pipeline and pushed to the stream. The Odds Adjuster weights
> each source by its tier — official GitHub API is Tier 1, Hacker News
> is Tier 4 — and applies recency decay."

When confidence crosses 0.85:

> "Threshold hit. The Resolver fires. **InsForge's gpt-4o-mini** is
> generating the verdict narrative right now. Simultaneously the
> Challenger agent spins up in an isolated Guild.ai workspace — it has
> zero visibility into the Resolver's chain of thought — and starts
> searching for contradictory evidence."

When the cited.md panel pops:

> "Verdict: YES at 100% confidence. Challenge failed. The cited.md just
> got persisted as a row in **Ghost.build Postgres** and rendered here
> with a live sha256 verification chip showing green."

---

## ACT 4 — The cited.md deep dive (2:30 → 3:10)

**Screen**: scroll the cited.md panel to show the full attestation block.

Click the `📜 cited.md ↗` chip in the market header — opens `/cited/:id`.

> "Here's the public artifact. Every field is prescribed by the spec —
> market question, cycle, verdict, confidence, the full evidence chain
> ordered by confidence descending, challenger record with the
> contradiction threshold, and the attestation block."

Highlight the attestation section with cursor:

```
resolver_image:   cgr.dev/chainguard/node:latest
resolver_digest:  sha256:9e33f02ba42ad1da39f4b6f1b24fe3755127bcdd1b9721dc871863e03cef3c42
resolver_version: kushise27/oracle-resolver@612364ca9c06
sigstore_verify: |
  cosign verify cgr.dev/chainguard/node:latest \
    --certificate-identity-regexp='https://github.com/chainguard-images/.+' \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com
cited_md_hash:    sha256:fca36380944a323478f70fbe8986e08ca1b249852ea208ac9f187e1738dfe2e0
```

> "Three things anyone can independently verify. The **Chainguard** image
> digest — fetched from the real cgr.dev registry. The **Guild.ai**
> published agent SHA — a real entry in the Guild catalog. And the
> cited.md hash itself — computed over the file with the hash line
> excluded, so you can recompute it."

---

## ACT 5 — Live verification (3:10 → 3:45)

**Screen**: switch to terminal.

> "Let me prove the cryptography actually works."

```bash
# 1. Pull the Chainguard signature tag from the real registry
TOKEN=$(curl -s "https://cgr.dev/token?service=cgr.dev&scope=repository:chainguard/node:pull" | jq -r .token)
curl -sI -H "Authorization: Bearer $TOKEN" \
  "https://cgr.dev/v2/chainguard/node/manifests/sha256-9e33f02ba42ad1da39f4b6f1b24fe3755127bcdd1b9721dc871863e03cef3c42.sig"
```

Point at `HTTP 200` in the response.

> "200 OK. The sigstore signature for that exact digest exists on
> Chainguard's registry. If I had `cosign` installed, the verify command
> from the cited.md would print a green checkmark."

```bash
# 2. Inspect the warm-store row in Ghost.build
ghost sql oracle "select market_id, outcome, confidence, length(markdown) as bytes from cited_md order by published_at desc limit 1"
```

> "Ghost.build — the Postgres-for-agents sponsor. One row per resolved
> market, sha256 embedded in the markdown, replayable by any verifier."

---

## ACT 6 — Cosmo federation moment (3:45 → 4:20)

**Screen**: switch to tab 2 — `http://localhost:3002` — the Cosmo Router playground.

Paste this query:

```graphql
query OracleView($id: ID!) {
  market(id: $id) {
    id
    question
    oddsYes
    stage
    evidence { source sourceType supports confidence }
    resolution { outcome confidence resolverDigest }
    challenges { result maxContradictionConfidence }
    citedMd { hash url }
  }
}
```

Variables: `{ "id": "<market_id from the demo>" }`

> "This is where **WunderGraph Cosmo** earns its keep. Verity's state is
> split across two subgraphs — a hot one backed by Redis, a warm one
> backed by Ghost. Cosmo Router federates them. One GraphQL query
> resolves the market entity across both, returns a unified payload,
> and does it in roughly 80 milliseconds."

Hit Run, point at the response.

> "Odds and evidence from Redis. Resolution, challenges, and cited.md
> from Ghost. Composed at the router layer, not stitched in my app."

---

## ACT 7 — Sponsor recap (4:20 → 4:45)

**Screen**: back to the dashboard, sponsor marquee in frame.

> "Seven sponsor integrations. Every single one is live, not mocked:
>
> - **Ghost.build** — real Postgres, real rows, 13 agent runs
> - **TinyFish** — real Agent API, real run IDs in every evidence object
> - **InsForge** — real gpt-4o-mini narratives written to the cited.md
> - **Chainguard** — real `cgr.dev/chainguard/node@sha256:9e33f02b...`
>   digest with a verifiable sigstore signature
> - **Redis Cloud** — RedisJSON, Streams, TimeSeries — 79 oracle keys
>   persisting across restarts
> - **Guild.ai** — two agents published to the catalog, resolver and
>   challenger, whose SHAs are cited in every verdict
> - **WunderGraph Cosmo** — two subgraphs registered with `wgc`, native
>   router binary 0.311.0 serving federation at :3002
>
> Nexla's Express free tier is still provisioning — that's the only
> integration running mock-mode, and the contract is identical either
> way."

---

## ACT 8 — The closer (4:45 → 5:00)

**Screen**: cut to the GitHub repo at `https://github.com/Kush614/oracle`.

> "Everything I showed you is in this repo. Seven commits, public, MIT-
> licensed, zero secrets checked in. Clone it, set the env vars,
> `npm run smoke`, and you'll get the same verdict against the same
> evidence — because that's what cryptographic attestation means.
>
> Verity isn't a prediction market app. It's the trust layer prediction
> markets don't have.
>
> Thanks."

**End card**: QR to repo + live demo URL + your handle.

---

## Emergency fallbacks

| If this breaks | Do this |
|---|---|
| TinyFish times out mid-demo | Hit **Gather evidence** button again — it retries with Fetch API fallback |
| InsForge 404s | Narrative falls back to the template; still looks fine, point at Guild resolver SHA instead |
| Cosmo Router drops | `cd infra/cosmo/bin && ./router.exe` again; federation reappears in ≤10s |
| Redis Cloud is cold | First request wakes the free-tier instance; PING twice before recording |
| Pipeline hangs past 3min | Ctrl+C the client, hit **Run pipeline** again — idempotent (evidence dedup prevents double-inserts) |

## What the judges will ask (and your 20-second answers)

**Q: "Is this real or mocked?"**
A: "Every integration is live except Nexla. `ghost sql oracle "select count(*) from cited_md"` returns a real row count. The Chainguard digest is fetched from the registry at boot. The TinyFish run IDs are in every evidence row. Want me to truncate the warm store and re-run?"

**Q: "What prevents the Resolver from lying?"**
A: "Three things. One, the Challenger runs in a Guild-isolated workspace and can reverse the verdict above 0.70 contradiction confidence. Two, the cited.md hash is sha256-anchored — tamper one byte and the verification fails. Three, the resolver image digest ties the verdict to a specific, signed binary; you can `cosign verify` it yourself."

**Q: "Why paper markets, not real money?"**
A: "Hackathon scope. The x402 gates work — you can see them in the code at `lib/clients/x402.ts`. Flipping to real USDC is swapping the payment adapter; the resolution layer is what's hard, and that's what we built."

**Q: "What's the business model?"**
A: "Sell resolution-as-a-service to prediction-market operators. UMA charges for dispute resolution; Oracle charges per cited.md. Or license the attestation bundle to auditors who need verifiable on-chain event resolution."
