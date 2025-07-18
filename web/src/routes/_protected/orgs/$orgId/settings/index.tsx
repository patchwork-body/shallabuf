import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { Separator } from "~/components/ui/separator";
import { Settings } from "lucide-react";
import { OrganizationDetailsCard } from "~/components/OrganizationDetailsCard";
import { TeamManagementCard } from "~/components/TeamManagementCard";
import { BillingCard } from "~/components/BillingCard";
import { DangerZoneCard } from "~/components/DangerZoneCard";
import {
  orgsGetFn,
  orgsListMembersAndInvitesFn,
} from "~/server-functions/orgs";

export const Route = createFileRoute("/_protected/orgs/$orgId/settings/")({
  loader: async ({ context, params }) => {
    try {
      const organization = await context.queryClient.ensureQueryData({
        queryKey: ["orgs", "get", params.orgId],
        queryFn: () => orgsGetFn({ data: { id: params.orgId } }),
      });

      const { members, invites } = await context.queryClient.ensureQueryData({
        queryKey: ["orgs", "listMembersAndInvites", params.orgId],
        queryFn: () =>
          orgsListMembersAndInvitesFn({
            data: { organizationId: params.orgId },
          }),
      });

      return { organization, members, invites };
    } catch (error) {
      throw new Error(
        `Failed to load organization: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
  component: SettingsPage,
  errorComponent: SettingsErrorComponent,
});

function SettingsPage() {
  const { organization } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="size-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Organization Settings
          </h1>
        </div>

        <p className="text-muted-foreground">
          Manage your organization's settings, billing, and preferences.
        </p>
      </div>

      <div className="space-y-8">
        <OrganizationDetailsCard orgId={organization.id} />
        <TeamManagementCard />
        <BillingCard orgId={organization.id} />
        <Separator className="my-8" />
        <DangerZoneCard orgId={organization.id} orgName={organization.name} />
      </div>
    </div>
  );
}

function SettingsErrorComponent() {
  return (
    <ErrorComponent error={new Error("Failed to load organization settings")} />
  );
}
