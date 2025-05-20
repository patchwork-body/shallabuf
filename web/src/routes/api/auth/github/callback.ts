import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { OAuth2Tokens } from "arctic";
import { env } from "~/env";
import { github } from "~/lib/oauth";

export const APIRoute = createAPIFileRoute("/api/auth/github/callback")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Get the stored state from cookies
    const storedState =
      request.headers
        .get("Cookie")
        ?.split("; ")
        .find((row) => row.startsWith("github_oauth_state="))
        ?.split("=")[1] ?? null;

    if (code === null || state === null || storedState === null) {
      return new Response(null, {
        status: 400,
      });
    }

    if (state !== storedState) {
      return new Response(null, {
        status: 400,
      });
    }

    let tokens: OAuth2Tokens;

    try {
      tokens = await github.validateAuthorizationCode(code);
    } catch (error) {
      // Invalid code or client credentials
      return new Response(null, {
        status: 400,
      });
    }

    // Clear the oauth state cookie
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "github_oauth_state=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    );

    try {
      const response = await fetch(`${env.API_URL}/auth/github/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken: tokens.accessToken() }),
      });

      if (!response.ok) {
        throw new Error("Failed to login");
      }

      const data = await response.json();

      headers.append(
        "Set-Cookie",
        `session=${data.token}; HttpOnly; Path=/; SameSite=${
          process.env.NODE_ENV === "production" ? "Strict" : "Lax"
        }; Secure=${process.env.NODE_ENV === "production"}; Expires=${new Date(
          data.expiresAt
        ).toUTCString()}`
      );

      headers.append("Location", "/dashboard");

      return new Response(null, {
        status: 302,
        headers,
      });
    } catch (error) {
      console.error(error);

      return new Response(null, {
        status: 500,
      });
    }
  },
});
