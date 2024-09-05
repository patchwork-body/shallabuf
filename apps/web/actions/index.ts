import { validateSession } from "@/helpers/validate-session";
import * as Sentry from "@sentry/nextjs";
import { setupAnalytics } from "@shallabuf/analytics/server";
import { ratelimit } from "@shallabuf/kv/ratelimit";
import { logger } from "@shallabuf/logger";
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action";
import { headers } from "next/headers";
import { z } from "zod";

const handleServerError = (error: Error) => {
  console.error("Action error:", error.message);

  if (error instanceof Error) {
    return error.message;
  }

  return DEFAULT_SERVER_ERROR_MESSAGE;
};

export const publicActionClient = createSafeActionClient({
  handleServerError,
  defineMetadataSchema() {
    return z.object({
      name: z.string(),
      track: z
        .object({
          event: z.string(),
          channel: z.string(),
        })
        .optional(),
    });
  },
});

export const authActionClient = publicActionClient
  .use(async ({ next, clientInput, metadata }) => {
    const result = await next({ ctx: {} });

    if (process.env.NODE_ENV === "development") {
      logger.info(`Input -> ${JSON.stringify(clientInput)}`);
      logger.info(`Result -> ${JSON.stringify(result.data)}`);
      logger.info(`Metadata -> ${JSON.stringify(metadata)}`);

      return result;
    }

    return result;
  })
  .use(async ({ next, metadata }) => {
    const ip = headers().get("X-Forwarded-For");

    const { success, remaining } = await ratelimit.limit(
      `${ip}-${metadata.name}`,
    );

    if (!success) {
      throw new Error("Too many requests");
    }

    return next({
      ctx: {
        ratelimit: {
          remaining,
        },
      },
    });
  })
  .use(async ({ next, metadata }) => {
    const { user } = await validateSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    if (metadata) {
      const analytics = await setupAnalytics({
        userId: user.id,
      });

      if (metadata.track) {
        analytics.track(metadata.track);
      }
    }

    return Sentry.withServerActionInstrumentation(metadata.name, async () => {
      return next({
        ctx: {
          user,
        },
      });
    });
  });
