# Oracle × WunderGraph Cosmo

Oracle ships two Apollo Federation v2 subgraphs that `wgc` can compose into a single
federated Cosmo Router endpoint.

```
                ┌──────────────────── Cosmo Router ─────────────────┐
                │                                                    │
  /graphql ─────┤  federated supergraph (Market ⊗ Resolution ⊗ …)   │
                │        ▲                                 ▲         │
                └────────┼─────────────────────────────────┼─────────┘
                         │                                 │
                    POST │ /api/graphql/hot       POST │ /api/graphql/warm
                         │                                 │
                 ┌───────┴────────┐                ┌──────┴──────────┐
                 │ Hot subgraph   │                │ Warm subgraph   │
                 │ (Redis-backed) │                │ (Ghost.build    │
                 │ Market state,  │                │  Postgres)      │
                 │ evidence,      │                │ Resolution,     │
                 │ odds timeseries│                │ Challenge,      │
                 └────────────────┘                │ CitedMd,        │
                                                   │ AgentScore      │
                                                   └─────────────────┘
```

Hot owns the live `Market` entity; warm extends `Market` with `resolution`,
`challenges`, and `citedMd`.

## Publish with wgc (Cosmo Cloud)

```bash
npm install -g wgc@latest
wgc login
wgc federated-graph create oracle --namespace default \
  --routing-url https://cosmo.wundergraph.com/your-router-url \
  --label-matcher team=oracle
wgc subgraph publish oracle-hot  --schema schema.hot.graphql \
  --routing-url http://localhost:3000/api/graphql/hot  --label team=oracle
wgc subgraph publish oracle-warm --schema schema.warm.graphql \
  --routing-url http://localhost:3000/api/graphql/warm --label team=oracle
```

Copy the Cosmo Router URL into `.env.local` as `WUNDERGRAPH_URL`. Oracle's
dashboard will switch from direct-federation fallback to Cosmo-routed queries
on next request.

## Run the router locally

```bash
docker run --rm -p 3002:3002 \
  -e FEDERATED_GRAPH_NAME=oracle \
  -e GRAPH_API_TOKEN=<from-cosmo-dashboard> \
  ghcr.io/wundergraph/cosmo/router:latest
```

Then `WUNDERGRAPH_URL=http://localhost:3002/graphql`.

## The canonical federated query

```graphql
query MarketFullView($id: ID!) {
  market(id: $id) {
    id
    question
    oddsYes
    evidence { source sourceType supports confidence }
    resolution { outcome confidence narrative resolverDigest }
    challenges { result maxContradictionConfidence }
    citedMd { hash url publishedAt }
  }
}
```

Hot contributes `id/question/oddsYes/evidence`, warm contributes
`resolution/challenges/citedMd`. Cosmo Router resolves the `Market` entity
across both subgraphs by the `@key(fields: "id")` directive.
