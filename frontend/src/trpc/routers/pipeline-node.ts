import { Metadata } from "@grpc/grpc-js";
import { z } from "zod";
import { pipelineNode } from "../grpc-client";
import { createTRPCRouter, protectedProcedure } from "../init";

export const pipelineNodeRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				pipelineId: z.string().uuid(),
				nodeId: z.string().uuid(),
				nodeVersion: z.string(),
				coords: z.object({
					x: z.number(),
					y: z.number(),
				}),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const metadata = new Metadata();
			metadata.set("authorization", ctx.sessionToken);

			const response = await pipelineNode.create(input, metadata);

			if (!response.node) {
				throw new Error("Failed to create pipeline node");
			}

			return {
				...response.node,
				coords: JSON.parse(response.node.coords),
			};
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				coords: z.object({
					x: z.number(),
					y: z.number(),
				}),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const metadata = new Metadata();
			metadata.set("authorization", ctx.sessionToken);

			const response = await pipelineNode.update(input, metadata);

			if (!response.node) {
				throw new Error("Failed to update pipeline node");
			}

			return {
				...response.node,
				coords: JSON.parse(response.node.coords),
			};
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input, ctx }) => {
			const metadata = new Metadata();
			metadata.set("authorization", ctx.sessionToken);

			return await pipelineNode.delete(input, metadata);
		}),
});
