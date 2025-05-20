import { createAPIFileRoute } from "@tanstack/react-start/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "~/trpc";
import { appRouter } from "~/trpc/routes/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export const APIRoute = createAPIFileRoute("/api/trpc/$")({
  GET: async ({ request }) => {
    return handler(request);
  },
  POST: async ({ request }) => {
    return handler(request);
  },
});
