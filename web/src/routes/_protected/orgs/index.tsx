import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CreateOrganizationDialog } from "~/components/CreateOrganizationDialog";
import { Button } from "~/components/ui/button";
import { useCallback } from "react";
import { orgsListFn } from "~/server-functions/orgs";

export const Route = createFileRoute("/_protected/orgs/")({
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.fetchQuery({
      queryKey: ["orgs", "list"],
      queryFn: () =>
        orgsListFn({
          data: {
            cursor: null,
            limit: 1,
          },
        }),
    });

    if (result.organizations.length > 0) {
      if (result.organizations[0]?.billingConnected) {
        throw redirect({
          to: "/orgs/$orgId/apps",
          params: { orgId: result.organizations[0].id },
        });
      } else {
        throw redirect({
          to: "/orgs/$orgId/apps",
          params: { orgId: result.organizations[0].id },
        });
      }
    }
  },
  component: SetupOrganization,
});

function SetupOrganization() {
  const navigate = useNavigate();

  const onOrganizationCreated = useCallback(
    (orgId: string) => {
      navigate({ to: "/orgs/$orgId/apps", params: { orgId } });
    },
    [navigate]
  );

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
      <p className="text-muted-foreground mb-6">
        Get started by creating your first organization
      </p>

      <CreateOrganizationDialog onSuccess={onOrganizationCreated}>
        <Button size="lg">Create Organization</Button>
      </CreateOrganizationDialog>
    </div>
  );
}
