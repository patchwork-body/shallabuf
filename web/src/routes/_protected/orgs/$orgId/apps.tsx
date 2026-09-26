import { createFileRoute, useParams } from "@tanstack/react-router";
import { AppList } from "~/components/AppList";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { appsListFn } from "~/server-functions/apps";
import { orgsListFn } from "~/server-functions/orgs";

export const Route = createFileRoute("/_protected/orgs/$orgId/apps")({
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.ensureInfiniteQueryData({
      queryKey: ["apps", "list", "infinite", params.orgId],
      queryFn: () => appsListFn({ data: { organizationId: params.orgId, cursor: null, limit: 10 } }),
      initialPageParam: null,
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    });

    await context.queryClient.ensureQueryData({
      queryKey: ["orgs", "list"],
      queryFn: () => orgsListFn({ data: { cursor: null, limit: 10 } }),
    });

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
      {orgId && <AppList organizationId={orgId} />}
    </HydrationBoundary>
  );
}
