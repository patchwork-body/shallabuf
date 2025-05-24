import { TRPCError } from "@trpc/server";
import { loginSchema, Session } from "~/lib/schemas";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../index";
import { env } from "~/env";
import { object, optional, string } from "valibot";

export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    try {
      const response = await fetch(`${env.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Login failed",
        });
      }

      const data = await response.json();

      if (!data.expiresAt) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid login response: missing expiration time",
        });
      }

      ctx.resHeaders.append(
        "Set-Cookie",
        `session=${data.token}; HttpOnly; Path=/; SameSite=${
          process.env.NODE_ENV === "production" ? "Strict" : "Lax"
        }; Secure=${process.env.NODE_ENV === "production"}; Expires=${new Date(
          data.expiresAt
        ).toUTCString()}`
      );

      return data;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during login",
      });
    }
  }),

  validateSession: protectedProcedure.query(async ({ ctx }) => {
    try {
      const response = await fetch(`${env.API_URL}/auth/validate-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: ctx.sessionToken }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid session",
        });
      }

      const data: { session: Session } = await response.json();
      return data.session;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during session validation",
      });
    }
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const response = await fetch(`${env.API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(response);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to logout",
        });
      }

      ctx.resHeaders.append(
        "Set-Cookie",
        "session=; HttpOnly; Path=/; SameSite=Lax; Secure=true; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during logout",
      });
    }
  }),
});
