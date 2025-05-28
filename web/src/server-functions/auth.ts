import { createServerFn } from "@tanstack/react-start";
import { setHeader } from "@tanstack/react-start/server";
import { object, pipe, string, email, minLength } from "valibot";
import { env } from "~/env";
import { Session } from "~/lib/schemas";
import { authorizationMiddleware } from "~/middlewares/authorization-middleware";

export const loginFn = createServerFn({
  method: "POST",
})
  .validator(
    object({
      email: pipe(string(), email()),
      password: pipe(string(), minLength(1)),
    })
  )
  .handler(async ({ data }) => {
    try {
      const response = await fetch(`${env.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const responseData = await response.json();

      if (!responseData.expiresAt) {
        throw new Error("Invalid login response: missing expiration time");
      }

      setHeader(
        "Set-Cookie",
        `session=${responseData.token}; HttpOnly; Path=/; SameSite=${
          process.env.NODE_ENV === "production" ? "Strict" : "Lax"
        }; Secure=${process.env.NODE_ENV === "production"}; Expires=${new Date(
          responseData.expiresAt
        ).toUTCString()}`
      );

      return responseData;
    } catch (error) {
      console.error(error);
      throw new Error("An unexpected error occurred during login");
    }
  });

export const logoutFn = createServerFn({
  method: "POST",
})
  .middleware([authorizationMiddleware])
  .handler(async ({ context }) => {
    try {
      const response = await fetch(`${env.API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setHeader(
        "Set-Cookie",
        "session=; HttpOnly; Path=/; SameSite=Lax; Secure=true; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      throw new Error("An unexpected error occurred during logout");
    }
  });

export const sessionFn = createServerFn({
  method: "GET",
})
  .middleware([authorizationMiddleware])
  .handler(async ({ context }) => {
    try {
      const response = await fetch(`${env.API_URL}/auth/validate-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: context.sessionToken }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data: { session: Session } = await response.json();
      return data.session;
    } catch (error) {
      console.error(error);
      throw new Error("An unexpected error occurred during session validation");
    }
  });
