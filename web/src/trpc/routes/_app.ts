import { createTRPCRouter } from "../index";
import { appsRouter } from "./apps";
import { authRouter } from "./auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  apps: appsRouter,
});

export type AppRouter = typeof appRouter;
