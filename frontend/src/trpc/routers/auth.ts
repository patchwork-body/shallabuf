import { Metadata } from "@grpc/grpc-js";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { loginSchema } from "~/lib/schemas";
import { auth } from "../grpc-client";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const authRouter = createTRPCRouter({
	login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
		const response = await auth.login(input);

		if (!response.expiresAt) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Invalid login response: missing expiration time",
			});
		}

		// Set the session cookie
		(await cookies()).set("session", response.token, {
			httpOnly: true,
			path: "/",
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			expires: new Date(response.expiresAt),
		});

		return response;
	}),

	logout: protectedProcedure.mutation(async ({ ctx }) => {
		const metadata = new Metadata();
		metadata.set("authorization", ctx.sessionToken);

		const response = await auth.logout(metadata);

		(await cookies()).delete("session");

		return response;
	}),

	validateSession: protectedProcedure.mutation(async ({ ctx }) => {
		const metadata = new Metadata();
		metadata.set("authorization", ctx.sessionToken);

		return await auth.validateSession(metadata);
	}),
});
