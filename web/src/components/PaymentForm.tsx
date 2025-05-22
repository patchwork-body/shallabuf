import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useCallback, useState } from "react";
import { Button } from "./ui/button";
import { useParams } from "@tanstack/react-router";

interface SetupPaymentMethodResponse {
  organizationId: string;
}

export function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { orgId } = useParams({ strict: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orgs/${orgId}/settings/billing/payment-confirmation`,
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "An error occurred while processing your payment.");
      setIsProcessing(false);
    }
  }, [stripe, elements]);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="rounded-lg border p-4">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="text-sm text-red-500">{errorMessage}</div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? "Processing..." : "Save Payment Method"}
      </Button>
    </form>
  );
}
