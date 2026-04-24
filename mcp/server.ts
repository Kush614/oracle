#!/usr/bin/env node
// oracle-mcp — stdio MCP server (spec §10).
//
// This is the thin shim published as `oracle-mcp` on npm. It does *not* hold
// any state; it forwards tool calls to the running Next.js deployment at
// ORACLE_API_URL. That way the MCP tool surface and the dashboard share one
// Redis bus, one Supabase warm store, one Ghost.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const API = process.env.ORACLE_API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.ORACLE_API_KEY;

const TOOLS = [
  {
    name: 'get_market',
    description: 'Return market card, current odds, stage, and agent runs for a given market_id.',
    inputSchema: {
      type: 'object',
      properties: { market_id: { type: 'string' } },
      required: ['market_id']
    }
  },
  {
    name: 'get_evidence_chain',
    description: 'Return the full evidence chain (deduplicated, ordered) for a market.',
    inputSchema: {
      type: 'object',
      properties: { market_id: { type: 'string' } },
      required: ['market_id']
    }
  },
  {
    name: 'get_resolution',
    description: 'Return the verdict object + cited.md hash + Ghost URL for a resolved market.',
    inputSchema: {
      type: 'object',
      properties: { market_id: { type: 'string' } },
      required: ['market_id']
    }
  },
  {
    name: 'create_market',
    description: 'Propose a new market. Triggers the x402 market_create paper gate.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        category: { type: 'string' },
        source_urls: { type: 'array', items: { type: 'string' } },
        deadline_hours: { type: 'number' },
        user_id: { type: 'string' }
      },
      required: ['question', 'source_urls']
    }
  },
  {
    name: 'get_agent_scores',
    description: 'Return the Guild.ai tournament leaderboard: per-agent accuracy, citation coverage, latency.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'challenge_resolution',
    description: 'Trigger an independent Challenger re-run on an already-resolved market (x402 gate).',
    inputSchema: {
      type: 'object',
      properties: { market_id: { type: 'string' }, user_id: { type: 'string' } },
      required: ['market_id']
    }
  },
  {
    name: 'fetch_cited_md',
    description: 'Return the full cited.md markdown for a resolved market, plus its Ghost URL.',
    inputSchema: {
      type: 'object',
      properties: { market_id: { type: 'string' } },
      required: ['market_id']
    }
  },
  {
    name: 'search_resolutions',
    description: 'Semantic search over past resolution narratives.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'list_markets',
    description: 'List all markets Oracle knows about, most recently created first.',
    inputSchema: { type: 'object', properties: {} }
  }
];

async function callRemote(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const resp = await fetch(`${API}/api/mcp/${tool}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {})
    },
    body: JSON.stringify(args)
  });
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'non-json response', status: resp.status, body: text };
  }
}

async function main() {
  const server = new Server(
    { name: 'oracle-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    const result = await callRemote(name, (args ?? {}) as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('oracle-mcp fatal:', err);
  process.exit(1);
});
