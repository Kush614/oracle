// Federation subgraph — hot (Redis-backed market state).
// Registered with Cosmo via:
//   wgc subgraph publish oracle-hot --schema schema.hot.graphql \
//     --routing-url http://localhost:3000/api/graphql/hot \
//     --namespace default

import { createYoga } from 'graphql-yoga';
import { hotSchema } from '@lib/graphql/hot-subgraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const yoga = createYoga({
  schema: hotSchema,
  graphqlEndpoint: '/api/graphql/hot',
  fetchAPI: { Request, Response }
});

export async function GET(request: Request) {
  return yoga.handleRequest(request, {});
}

export async function POST(request: Request) {
  return yoga.handleRequest(request, {});
}
