import { Elements } from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PaymentForm } from "./PaymentForm";
import { getStripe } from "~/lib/stripe";
import { Button } from "./ui/button";
import { stripeCreatePaymentIntentFn } from "~/server-functions/stripe";

interface PaymentSetupFormProps {
  orgId: string;
}

export function PaymentSetupForm({ orgId }: PaymentSetupFormProps) {
  const [clientSecret, setClientSecret] = useState<string | undefined>();

  const createPaymentIntentMutation = useMutation({
    mutationFn: stripeCreatePaymentIntentFn,
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
  });

  useEffect(() => {
    if (
      !clientSecret &&
      orgId &&
      createPaymentIntentMutation.isIdle
    ) {
      createPaymentIntentMutation.mutate({ data: { organizationId: orgId } });
    }
  }, [
    clientSecret,
    orgId,
    createPaymentIntentMutation.isIdle,
  ]);

  return (
    <div className="flex flex-col items-center justify-center gap-y-4">
      <h1 className="text-2xl font-bold">Billing Setup</h1>
      <p className="text-muted-foreground">
        Add a payment method to your organization to get started.
      </p>

      {createPaymentIntentMutation.isError && (
        <div className="text-sm text-red-500 text-center">
          Failed to set up payment. Please try again.
        </div>
      )}

      {clientSecret && (
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret: clientSecret,
            appearance: { theme: "night" },
          }}
        >
          <PaymentForm />
        </Elements>
      )}

      {!clientSecret && !createPaymentIntentMutation.isPending && (
        <Button
          onClick={() =>
            createPaymentIntentMutation.mutate({ data: { organizationId: orgId }})
          }
          disabled={createPaymentIntentMutation.isPending}
        >
          {createPaymentIntentMutation.isPending
            ? "Setting up..."
            : "Set Up Payment Method"}
        </Button>
      )}
    </div>
  );
} 