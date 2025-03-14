import { TRPCError, initTRPC } from "@trpc/server";
import { cache } from "react";
import { getSessionToken } from "~/lib/auth";
import { transformer } from "./transformer";

export const createTRPCContext = cache(async () => {
	/**
	 * @see: https://trpc.io/docs/server/context
	 */
	const sessionToken = await getSessionToken();

	return { sessionToken };
});

// Type for the TRPC context value
export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<TRPCContext>().create({
	/**
	 * @see https://trpc.io/docs/server/data-transformers
	 */
	transformer,
});

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
