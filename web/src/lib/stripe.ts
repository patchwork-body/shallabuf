import { loadStripe, Stripe, StripeCheckoutOptions, StripeElementsOptions } from "@stripe/stripe-js";
import { env } from "~/env";

// This is a singleton to ensure we only load Stripe once
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(env.VITE_STRIPE_PUBLISHABLE_KEY);
  }

  return stripePromise;
};

export const stripeOptions: StripeElementsOptions = {
  appearance: {
    theme: "stripe",
  },
};
