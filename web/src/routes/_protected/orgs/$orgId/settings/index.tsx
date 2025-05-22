import {
  createFileRoute,
  ErrorComponent,
} from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { trpc } from "~/trpc/client";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Settings } from "lucide-react";
import { OrganizationDetailsCard } from "~/components/OrganizationDetailsCard";
import { TeamManagementCard } from "~/components/TeamManagementCard";
import { BillingCard } from "~/components/BillingCard";
import { DangerZoneCard } from "~/components/DangerZoneCard";

export const Route = createFileRoute("/_protected/orgs/$orgId/settings/")({
  loader: async ({ context, params }) => {
    try {
      const organization = await context.queryClient.ensureQueryData(
        trpc.orgs.get.queryOptions({ id: params.orgId })
      );
      return { organization };
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
          <Settings className="h-8 w-8 text-blue-600" />
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
  return <ErrorComponent error={new Error("Failed to load organization settings")} />;
}
