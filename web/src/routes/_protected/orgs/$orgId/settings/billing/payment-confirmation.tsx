import {
  createFileRoute,
  redirect,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "~/lib/stripe";
import { trpc } from "~/trpc/client";
import { TRPCClientError } from "@trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { cn } from "~/lib/utils";

export const Route = createFileRoute(
  "/_protected/orgs/$orgId/settings/billing/payment-confirmation"
)({
  loader: async ({ context, params }) => {
    try {
      const result = await context.queryClient.fetchQuery(
        trpc.stripe.getPaymentIntent.queryOptions({
          organizationId: params.orgId,
        })
      );

      return result;
    } catch (error) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "NOT_FOUND"
      ) {
        throw redirect({
          to: "/orgs/$orgId/settings/billing",
          params: { orgId: params.orgId },
        });
      }

      throw error;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const searchParams: { setup_intent_client_secret: string } = useSearch({
    from: "/_protected/orgs/$orgId/settings/billing/payment-confirmation",
  });

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret: data.clientSecret,
        appearance: { theme: "night" },
      }}
    >
      <PaymentConfirmation
        setupIntentClientSecret={searchParams.setup_intent_client_secret}
      />
    </Elements>
  );
}

interface PaymentConfirmationProps {
  setupIntentClientSecret: string;
}

type PaymentStatus = "processing" | "success" | "error" | "validating";

function PaymentConfirmation({
  setupIntentClientSecret,
}: PaymentConfirmationProps) {
  const [status, setStatus] = useState<PaymentStatus>("validating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const stripe = useStripe();
  const navigate = useNavigate();
  const { orgId } = useParams({ strict: false });
  const queryClient = useQueryClient();

  const updatePaymentIntentMutation = useMutation({
    ...trpc.stripe.updatePaymentIntent.mutationOptions(),
    onSuccess: () => {
      if (orgId) {
        // Invalidate organization queries to refresh billing status
        queryClient.invalidateQueries(
          trpc.orgs.get.queryOptions({ id: orgId })
        );
        queryClient.invalidateQueries(trpc.orgs.list.queryOptions({}));

        // Add a slight delay for better UX
        setTimeout(() => {
          navigate({ to: "/orgs/$orgId/settings/billing", params: { orgId } });
        }, 1500);
      }
    },
    onError: (error) => {
      setStatus("error");
      setErrorMessage(error.message || "Failed to update payment method");
    },
  });

  const processPaymentIntent = async () => {
    if (!stripe || !setupIntentClientSecret) {
      return;
    }

    try {
      setStatus("processing");
      setErrorMessage(null);

      const { setupIntent, error } = await stripe.retrieveSetupIntent(
        setupIntentClientSecret
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!setupIntent) {
        throw new Error("Setup intent not found");
      }

      switch (setupIntent.status) {
        case "succeeded":
          setStatus("success");

          if (
            orgId &&
            setupIntent.payment_method &&
            typeof setupIntent.payment_method === "string"
          ) {
            updatePaymentIntentMutation.mutate({
              organizationId: orgId,
              paymentMethodId: setupIntent.payment_method,
            });
          } else {
            throw new Error("Payment method information is missing");
          }
          break;

        case "processing":
          setStatus("processing");
          // Poll for status updates
          setTimeout(() => processPaymentIntent(), 3000);
          break;

        case "requires_payment_method":
          throw new Error(
            "The payment method was declined. Please try a different payment method."
          );

        case "canceled":
          throw new Error("Payment setup was canceled.");

        default:
          throw new Error(
            "An unexpected error occurred during payment processing."
          );
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await processPaymentIntent();
    setIsRetrying(false);
  };

  const handleBackToBilling = () => {
    if (orgId) {
      navigate({ to: "/orgs/$orgId/settings/billing", params: { orgId } });
    }
  };

  useEffect(() => {
    processPaymentIntent();
  }, [stripe, setupIntentClientSecret]);

  const getStatusConfig = () => {
    switch (status) {
      case "validating":
        return {
          icon: <Loader2 className="h-12 w-12 animate-spin text-blue-500" />,
          title: "Validating Payment...",
          description: "We're setting up your payment method.",
          titleColor: "text-blue-600",
          bgColor: "bg-blue-50 border-blue-200",
        };
      case "processing":
        return {
          icon: <Loader2 className="h-12 w-12 animate-spin text-blue-500" />,
          title: "Processing Payment...",
          description:
            "Please wait while we confirm your payment method. This may take a few moments.",
          titleColor: "text-blue-600",
          bgColor: "bg-blue-50 border-blue-200",
        };
      case "success":
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          title: "Payment Method Added Successfully!",
          description:
            "Your payment method has been securely saved. Redirecting you to the billing dashboard...",
          titleColor: "text-green-600",
          bgColor: "bg-green-50 border-green-200",
        };
      case "error":
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: "Payment Setup Failed",
          description:
            errorMessage ||
            "Something went wrong while setting up your payment method.",
          titleColor: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className={cn("border-2 shadow-lg", statusConfig.bgColor)}>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">{statusConfig.icon}</div>
            <CardTitle
              className={cn("text-xl font-bold", statusConfig.titleColor)}
            >
              {statusConfig.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="text-center space-y-6">
            <CardDescription className="text-base leading-relaxed">
              {statusConfig.description}
            </CardDescription>

            {/* Progress indicators */}
            {(status === "validating" || status === "processing") && (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Secure payment processing</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}

            {/* Success state actions */}
            {status === "success" && (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Payment method verified</span>
                </div>
                <Button
                  onClick={handleBackToBilling}
                  className="w-full"
                  variant="outline"
                >
                  Go to Billing Dashboard
                </Button>
              </div>
            )}

            {/* Error state actions */}
            {status === "error" && (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Setup failed</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full"
                    variant="default"
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleBackToBilling}
                    className="w-full"
                    variant="outline"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Billing
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state indicator */}
            {updatePaymentIntentMutation.isPending && (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating billing information...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional security notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center space-x-1">
            <span>🔒</span>
            <span>Your payment information is encrypted and secure</span>
          </p>
        </div>
      </div>
    </div>
  );
}
