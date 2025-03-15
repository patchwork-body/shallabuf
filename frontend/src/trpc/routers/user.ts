import { Metadata } from "@grpc/grpc-js";
import { user } from "../grpc-client";
import { createTRPCRouter, protectedProcedure } from "../init";

export const userRouter = createTRPCRouter({
	me: protectedProcedure.query(async ({ ctx }) => {
		const metadata = new Metadata();
		metadata.set("authorization", ctx.sessionToken);

		return await user.me(metadata);
	}),
});
