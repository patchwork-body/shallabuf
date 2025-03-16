import { Metadata } from "@grpc/grpc-js";
import { z } from "zod";
import { createPipelineSchema } from "~/lib/schemas";
import { pipeline } from "../grpc-client";
import { createTRPCRouter, protectedProcedure } from "../init";

export const pipelineRouter = createTRPCRouter({
	list: protectedProcedure
		.input(z.object({ teamId: z.string() }))
		.query(async ({ input, ctx }) => {
			const metadata = new Metadata();
			metadata.set("authorization", ctx.sessionToken);

			return await pipeline.list({ teamId: input.teamId }, metadata);
		}),

	create: protectedProcedure
		.input(createPipelineSchema)
		.mutation(async ({ input, ctx }) => {
			const metadata = new Metadata();
			metadata.set("authorization", ctx.sessionToken);

			return await pipeline.create(
				{
					teamId: input.teamId,
					name: input.name,
					description: input.description,
				},
				metadata,
			);
		}),
});
