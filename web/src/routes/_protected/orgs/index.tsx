import { createFileRoute, redirect } from "@tanstack/react-router";
import { trpc } from "~/trpc/client";
import { CreateOrganizationDialog } from "~/components/CreateOrganizationDialog";
import { Button } from "~/components/ui/button";

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

    return {
      noOrgs: true
    };
  },
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
      <p className="text-muted-foreground mb-6">Get started by creating your first organization</p>
      <CreateOrganizationDialog>
        <Button size="lg">Create Organization</Button>
      </CreateOrganizationDialog>
    </div>
  ),
});
