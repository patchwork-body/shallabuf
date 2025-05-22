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
  pendingComponent: SettingsPageSkeleton,
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

function SettingsPageSkeleton() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Skeleton className="h-8 w-80 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-32" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
