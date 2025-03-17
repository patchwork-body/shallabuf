import { Metadata } from "@grpc/grpc-js";
import { node } from "../grpc-client";
import { createTRPCRouter, protectedProcedure } from "../init";

export const nodeRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const metadata = new Metadata();
		metadata.set("authorization", ctx.sessionToken);

		return (await node.list({}, metadata)).nodes.map((node) => {
			return {
				...node,
				config: JSON.parse(node.config),
			};
		});
	}),
});
