import { createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { nodeRouter } from "./node";
import { pipelineRouter } from "./pipeline";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
	auth: authRouter,
	user: userRouter,
	pipeline: pipelineRouter,
	node: nodeRouter,
});

export type AppRouter = typeof appRouter;
