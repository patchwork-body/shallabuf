import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { trpc } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

interface BillingCardProps {
  orgId: string;
}

export function BillingCard({ orgId }: BillingCardProps) {
  const createPortalSessionMutation = useMutation(trpc.stripe.createPortalSession.mutationOptions());

  const handleManageBilling = useCallback(async () => {
    try {
      const returnUrl = `${window.location.origin}/orgs/${orgId}/settings`;

      const data = await createPortalSessionMutation.mutateAsync({
        organizationId: orgId,
        returnUrl,
      });

      window.location.href = data.url;
    } catch (error) {
      // Error will be displayed via createPortalSessionMutation.error
      console.error("Failed to create portal session:", error);
    }
  }, [orgId, createPortalSessionMutation.mutateAsync]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-purple-600" />
          <CardTitle>Billing</CardTitle>
        </div>
        <CardDescription>
          Manage your payment methods and billing preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          You are currently on the <span className="font-bold">Free</span> plan.
        </p>
        {createPortalSessionMutation.error && (
          <div className="text-sm text-destructive mt-2">
            {createPortalSessionMutation.error.message}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <Button
          variant="secondary"
          className="w-full sm:w-auto ml-auto"
          onClick={handleManageBilling}
          disabled={createPortalSessionMutation.isPending}
        >
          {createPortalSessionMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 size-4" />
          )}
          Manage Billing
        </Button>
      </CardFooter>
    </Card>
  );
}
