import { createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { pipelineRouter } from "./pipeline";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
	auth: authRouter,
	user: userRouter,
	pipeline: pipelineRouter,
});

export type AppRouter = typeof appRouter;
