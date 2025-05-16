import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { getQueryClient } from "~/lib/query-client";
import type { AppRouter } from "./routes/_app";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { getWebRequest } from "@tanstack/react-start/server";
import { getSessionToken } from "~/lib/session";

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

            if (typeof window === "undefined") {
              const request = getWebRequest();

              if (request) {
                const sessionToken = getSessionToken(request);

                if (sessionToken) {
                  const headers = new Headers(options?.headers);
                  headers.set("Cookie", `session=${sessionToken}`);

                  const headerObj: Record<string, string> = {};
                  headers.forEach((value, key) => {
                    headerObj[key] = value;
                  });

                  options = {
                    ...options,
                    headers: headerObj,
                  };
                }
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
