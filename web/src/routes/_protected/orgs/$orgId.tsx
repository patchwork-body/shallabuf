import { createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { trpc } from "~/trpc/client";
import { AppList } from "~/components/AppList";
import { ListAppsResponse } from "~/lib/schemas";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";

export const Route = createFileRoute("/_protected/orgs/$orgId")({
  beforeLoad: async ({ context, params, location }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    try {
      await context.queryClient.ensureInfiniteQueryData({
        ...trpc.apps.list.infiniteQueryOptions({
          organizationId: params.orgId,
          cursor: undefined,
          limit: 10,
        }),
        getNextPageParam: (lastPage: ListAppsResponse) => lastPage.nextCursor,
      });

      await context.queryClient.ensureQueryData(trpc.orgs.list.queryOptions({}));
    } catch (error) {
      if (error instanceof TRPCClientError) {
        if (error.data.code === "UNAUTHORIZED") {
          throw redirect({ to: "/login", replace: true });
        }
      }

      throw error;
    }

    const dehydratedState = dehydrate(context.queryClient);

    return { dehydratedState };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId } = useParams({ strict: false });
  const { dehydratedState } = Route.useRouteContext();

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="flex flex-col gap-8 min-w-[70%] mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
          Your Apps
        </h1>
        {orgId && <AppList organizationId={orgId} />}
      </div>
    </HydrationBoundary>
  );
}
