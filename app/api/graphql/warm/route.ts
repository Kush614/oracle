// Federation subgraph — warm (Ghost.build-backed resolution records).
// Registered with Cosmo via:
//   wgc subgraph publish oracle-warm --schema schema.warm.graphql \
//     --routing-url http://localhost:3000/api/graphql/warm \
//     --namespace default

import { createYoga } from 'graphql-yoga';
import { warmSchema } from '@lib/graphql/warm-subgraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const yoga = createYoga({
  schema: warmSchema,
  graphqlEndpoint: '/api/graphql/warm',
  fetchAPI: { Request, Response }
});

export async function GET(request: Request) {
  return yoga.handleRequest(request, {});
}

export async function POST(request: Request) {
  return yoga.handleRequest(request, {});
}
