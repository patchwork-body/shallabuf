import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "~/trpc/client";
import { BillingManagementView } from "~/components/BillingManagementView";
import { PaymentSetupForm } from "~/components/PaymentSetupForm";

export const Route = createFileRoute(
  "/_protected/orgs/$orgId/settings/billing/"
)({
  loader: async ({ context, params }) => {
    // Load both organization data and payment intent data
    const [orgResult, paymentIntentResult] = await Promise.allSettled([
      context.queryClient.fetchQuery(
        trpc.orgs.get.queryOptions({ id: params.orgId })
      ),

      context.queryClient
        .fetchQuery(
          trpc.stripe.getPaymentIntent.queryOptions({
            organizationId: params.orgId,
          })
        )
        .catch((error) => {
          if (
            error instanceof TRPCClientError &&
            error.data?.code === "NOT_FOUND"
          ) {
            return null;
          }
          throw error;
        }),
    ]);

    const organization =
      orgResult.status === "fulfilled" ? orgResult.value : null;
    const paymentIntent =
      paymentIntentResult.status === "fulfilled"
        ? paymentIntentResult.value
        : null;

    return {
      organization,
      paymentIntent,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId } = useParams({ strict: false });
  const data = Route.useLoaderData();

  // Query organization data to check billing status
  const orgQuery = useQuery({
    ...trpc.orgs.get.queryOptions({ id: orgId! }),
    enabled: !!orgId,
    ...(data.organization && { initialData: data.organization }),
  });

  // Show loading state while fetching organization data
  if (orgQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-4">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show error state if organization not found
  if (!orgQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-4">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  const organization = orgQuery.data;

  // If billing is already connected, show billing management UI
  if (organization.billingConnected) {
    return (
      <BillingManagementView 
        organization={organization} 
        orgId={orgId!} 
      />
    );
  }

  // If billing is not connected, show payment setup form
  return <PaymentSetupForm orgId={orgId!} />;
}
