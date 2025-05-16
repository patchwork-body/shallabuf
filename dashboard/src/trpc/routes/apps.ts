import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "../index";
import { env } from "~/env";
import { z } from "zod";
import {
  createAppResponseSchema,
  createAppSchema,
  listAppsResponseSchema,
} from "~/lib/schemas";

export const appsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createAppSchema)
    .output(createAppResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const response = await fetch(`${env.API_URL}/apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.sessionToken}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create app",
        });
      }

      return await response.json();
    }),

  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .output(listAppsResponseSchema)
    .query(async ({ ctx, input }) => {
      const searchParams = new URLSearchParams();

      if (input.cursor) {
        searchParams.set("cursor", input.cursor);
      }

      if (input.limit) {
        searchParams.set("limit", input.limit.toString());
      }

      try {
        const response = await fetch(
          `${env.API_URL}/apps/list?${searchParams.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ctx.sessionToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list apps",
          });
        }

        return await response.json();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list apps",
        });
      }
    }),
});
