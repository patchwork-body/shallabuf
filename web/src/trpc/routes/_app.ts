import { createTRPCRouter } from "../index";
import { appsRouter } from "./apps";
import { authRouter } from "./auth";
import { orgsRouter } from "./orgs";
import { stripeRouter } from "./stripe";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  apps: appsRouter,
  orgs: orgsRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
