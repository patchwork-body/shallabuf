import { createTRPCRouter } from "../index";
import { appsRouter } from "./apps";
import { authRouter } from "./auth";
import { orgsRouter } from "./orgs";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  apps: appsRouter,
  orgs: orgsRouter,
});

export type AppRouter = typeof appRouter;
