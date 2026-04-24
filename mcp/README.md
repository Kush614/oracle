# oracle-mcp

Stdio MCP server for Oracle. Exposes the eight tools from spec §10 over the Model Context Protocol.

## Install for Claude Desktop

```json
{
  "mcpServers": {
    "oracle": {
      "command": "npx",
      "args": ["-y", "oracle-mcp"],
      "env": {
        "ORACLE_API_URL": "http://localhost:3000",
        "ORACLE_API_KEY": ""
      }
    }
  }
}
```

## Tools

- `get_market(market_id)`
- `get_evidence_chain(market_id)`
- `get_resolution(market_id)`
- `create_market(question, source_urls, deadline_hours?)` — triggers x402 paper gate
- `get_agent_scores()`
- `challenge_resolution(market_id)` — triggers x402 paper gate
- `fetch_cited_md(market_id)`
- `search_resolutions(query)`
- `list_markets()`

## State model

The stdio binary is stateless. All tool calls proxy to `ORACLE_API_URL/api/mcp/<tool>`. State lives in the
Oracle Next.js deployment (Redis + Supabase + Ghost).
