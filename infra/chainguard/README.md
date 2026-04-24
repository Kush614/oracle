# Oracle × Chainguard

Chainguard has two pieces, and Oracle wires both.

## Containers — live, cited.md attestation

Oracle's resolver runs on `cgr.dev/chainguard/node:latest` (spec §12.1, §8.8).
Every `cited.md` embeds the current image digest and a working sigstore
verify command:

```
resolver_image:   cgr.dev/chainguard/node:latest
resolver_digest:  sha256:9e33f02ba42ad1da39f4b6f1b24fe3755127bcdd1b9721dc871863e03cef3c42
sigstore_verify: |
  cosign verify cgr.dev/chainguard/node:latest \
    --certificate-identity-regexp='https://github.com/chainguard-images/.+' \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

**Refresh the digest** by querying the registry (no Docker or signup needed):

```bash
TOKEN=$(curl -s "https://cgr.dev/token?service=cgr.dev&scope=repository:chainguard/node:pull" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
curl -sI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  "https://cgr.dev/v2/chainguard/node/manifests/latest" \
  | awk -F': ' 'tolower($1)=="docker-content-digest" {print $2}' | tr -d '\r'
```

Paste into `CHAINGUARD_DIGEST=` in `.env.local`.

## Libraries — opt-in, malware-resistant npm mirror

The setup is in this repo but disabled by default because some of Oracle's
deps (notably `graphql` and `graphql-yoga@5`) aren't yet in Chainguard's
catalog — they enforce a 7-day cooldown on new package versions before
serving them, and a few packages aren't mirrored at all.

### Provisioning (one-time, done)

```bash
chainctl auth login --headless
chainctl libraries entitlements create --parent <org-id> \
  --ecosystems=JAVASCRIPT --policy=chainguard_and_upstream
chainctl auth pull-token --repository=javascript --ttl=720h --parent <org-id>
```

The pull token's username + password base64'd together is written to
`.npmrc.chainguard` (gitignored).

### To build against Chainguard libraries

```bash
# Swap registries
mv .npmrc.chainguard .npmrc
rm -rf node_modules package-lock.json

# Constraints may need relaxing — Chainguard listings lag npm by 7 days
npm install
```

If `install` fails on missing packages, either:
- wait for Chainguard to mirror them (cooldown period), or
- downgrade `package.json` constraints to what Chainguard lists

Current gaps observed on 2026-04-24:
- `graphql` — not in mirror
- `graphql-yoga` — only v1.x mirrored (we use v5)
- `@apollo/subgraph` — 2.13.0/2.13.1 mirrored; any newer falls through

### Why keep it set up even if disabled

The entitlement + pull-token remain valid for 30 days; all a Chainguard
deployment needs is `mv .npmrc.chainguard .npmrc` once the missing packages
land in their mirror. The container side (which is what the cited.md
attestation block depends on) is already live — and that's the security story
that appears in every published resolution.
