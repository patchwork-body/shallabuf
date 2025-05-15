import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { getQueryClient } from "~/lib/query-client";
import type { AppRouter } from "./routes/_app";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";
    return "http://localhost:3000";
  })();

  return `${base}/api/trpc`;
}

export function createTrpcClient() {
  return createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient({
      links: [
        httpBatchLink({
          url: getUrl(),
          fetch: (url, options) => {
            let body = options?.body;

            if (body instanceof Uint8Array) {
              const ab = body.buffer;

              if (ab instanceof ArrayBuffer) {
                body = new Blob([ab]);
              } else {
                body = new Blob([new Uint8Array(body)]);
              }
            }

            return fetch(url, {
              ...options,
              body,
              credentials: "include",
            });
          },
        }),
      ],
    }),
    queryClient: getQueryClient(),
  });
}

export const trpc = createTrpcClient();
