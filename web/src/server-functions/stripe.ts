import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { object, pipe, string, uuid, url } from "valibot";
import { env } from "~/env";
import { authorizationMiddleware } from "~/middlewares/authorization-middleware";

export const stripeCreatePortalSessionFn = createServerFn({
  method: "POST",
})
  .middleware([authorizationMiddleware])
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
      returnUrl: pipe(string(), url()),
    })
  )
  .handler(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/stripe/portal-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create portal session");
    }

    return response.json();
  });

export const stripeCreatePaymentIntentFn = createServerFn({
  method: "POST",
})
  .middleware([authorizationMiddleware])
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
    })
  )
  .handler(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/stripe/payment-intents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return response.json();
  });

export const stripeGetPaymentIntentFn = createServerFn({
  method: "GET",
})
  .middleware([authorizationMiddleware])
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
    })
  )
  .handler(async ({ data, context }) => {
    const response = await fetch(
      `${env.API_URL}/stripe/payment-intents/${data.organizationId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.sessionToken}`,
        },
      }
    );

    if (response.status === 404) {
      throw notFound();
    }

    if (!response.ok) {
      throw new Error("Failed to get payment intent");
    }

    return response.json();
  });

export const stripeUpdatePaymentIntentFn = createServerFn({
  method: "POST",
})
  .middleware([authorizationMiddleware])
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
    })
  )
  .handler(async ({ data, context }) => {
    const response = await fetch(
      `${env.API_URL}/stripe/payment-intents/${data.organizationId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.sessionToken}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return response.json();
  });
