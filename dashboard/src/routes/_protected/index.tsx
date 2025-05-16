import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { trpc } from "~/trpc/client";
import { AppList } from "~/components/AppList";
import { ListAppsResponse } from "~/lib/schemas";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";

export const Route = createFileRoute("/_protected/")({
  beforeLoad: async ({ context }) => {
    try {
      const { session } = await context.queryClient.fetchQuery(
        trpc.auth.validateSession.queryOptions()
      );

      if (!session) {
        throw redirect({ to: "/login", replace: true });
      }

      await context.queryClient.ensureInfiniteQueryData({
        ...trpc.apps.list.infiniteQueryOptions({
          cursor: undefined,
          limit: 10,
        }),
        getNextPageParam: (lastPage: ListAppsResponse) => lastPage.nextCursor,
      });

      const dehydratedState = dehydrate(context.queryClient);

      return { session, dehydratedState };
    } catch (error) {
      if (error instanceof TRPCClientError) {
        if (error.data.code === "UNAUTHORIZED") {
          throw redirect({ to: "/login", replace: true });
        }
      }

      throw error;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { dehydratedState } = Route.useRouteContext();

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-pink-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <main className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">Your Apps</h1>
          <AppList />
        </main>
      </div>
    </HydrationBoundary>
  );
}
