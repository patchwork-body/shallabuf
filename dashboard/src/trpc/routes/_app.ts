import { createTRPCRouter, publicProcedure } from "../index";
import { z } from "zod";

export const appRouter = createTRPCRouter({
  login: publicProcedure.input(z.object({
    email: z.string(),
    password: z.string(),
  })).mutation(async ({ input }) => {
    return {
      success: true,
    };
  }),
});

export type AppRouter = typeof appRouter;
