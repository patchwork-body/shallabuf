import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

export const appRouter = createTRPCRouter({
  auth: createTRPCRouter({
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }),
      )
      .mutation(async ({ input }) => {}),
  }),
});

export type AppRouter = typeof appRouter;
