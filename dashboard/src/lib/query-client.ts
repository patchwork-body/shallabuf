import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";

let clientQueryClientSingleton: QueryClient;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: use singleton pattern to keep the same query client
  // biome-ignore lint/suspicious/noAssignInExpressions: Safe inline assignment used to create a singleton on the client side
  return (clientQueryClientSingleton ??= makeQueryClient());
}
