import {
  createPaymentIntentResponseSchema,
  createPaymentIntentSchema,
  paymentIntentInfoSchema,
  getPaymentIntentSchema,
  updatePaymentIntentSchema,
} from "~/lib/schemas";
import { createTRPCRouter, protectedProcedure } from "..";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";

export const stripeRouter = createTRPCRouter({
  createPaymentIntent: protectedProcedure
    .input(createPaymentIntentSchema)
    .output(createPaymentIntentResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(`${env.API_URL}/stripe/payment-intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.sessionToken}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      return response.json();
    }),

  getPaymentIntent: protectedProcedure
    .input(getPaymentIntentSchema)
    .output(paymentIntentInfoSchema)
    .query(async ({ input, ctx }) => {
      const response = await fetch(
        `${env.API_URL}/stripe/payment-intents/${input.organizationId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ctx.sessionToken}`,
          },
        }
      );

      if (response.status === 404) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment intent not found",
        });
      }

      if (!response.ok) {
        throw new Error("Failed to get payment intent");
      }

      return response.json();
    }),

  updatePaymentIntent: protectedProcedure
    .input(updatePaymentIntentSchema)
    .output(paymentIntentInfoSchema)
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(
        `${env.API_URL}/stripe/payment-intents/${input.organizationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ctx.sessionToken}`,
          },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update payment intent");
      }

      return response.json();
    }),
});
