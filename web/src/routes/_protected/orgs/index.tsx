import { createFileRoute, redirect } from "@tanstack/react-router";
import { trpc } from "~/trpc/client";

export const Route = createFileRoute("/_protected/orgs/")({
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.fetchQuery(
      trpc.orgs.list.queryOptions({ limit: 1 })
    );

    if (result.organizations.length > 0) {
      throw redirect({
        to: "/orgs/$orgId",
        params: { orgId: result.organizations[0].id },
      });
    }

    throw redirect({
      to: "/login",
    });
  },
});
