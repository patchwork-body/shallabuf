import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { getSessionToken } from "~/lib/session";

export const createTRPCContext = cache(
  async ({ req, resHeaders }: { req?: Request; resHeaders: Headers }) => {
    /**
     * @see: https://trpc.io/docs/server/context
     */
    const sessionToken = req ? getSessionToken(req) : undefined;

    return { req, resHeaders, sessionToken };
  }
);

// Type for the TRPC context value
export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<TRPCContext>().create({});

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.sessionToken) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      sessionToken: ctx.sessionToken,
    },
  });
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
