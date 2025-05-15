import { createAPIFileRoute } from '@tanstack/react-start/api'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '~/trpc';
import { appRouter } from '~/trpc/routes/_app';
import { getWebRequest } from '@tanstack/react-start/server';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export const APIRoute = createAPIFileRoute('/api/trpc/$')({
  GET: async ({ request }) => {
    console.log(getWebRequest());
    return handler(getWebRequest() ?? request);
  },
  POST: async ({ request }) => {
    return handler(getWebRequest() ?? request);
  },
});
