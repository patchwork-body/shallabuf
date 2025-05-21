import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { decodeIdToken, OAuth2Tokens } from "arctic";
import { env } from "~/env";
import { google } from "~/lib/oauth";

export const APIRoute = createAPIFileRoute("/api/auth/google/callback")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookies = request.headers.get("Cookie") || "";

    // Parse cookies into an object for easier handling
    const parsedCookies = Object.fromEntries(
      cookies.split("; ").map((cookie) => {
        const [name, value] = cookie.split("=");
        return [name, value];
      })
    );

    const storedState = parsedCookies.google_oauth_state;
    const codeVerifier = parsedCookies.google_code_verifier;

    // Detailed validation
    if (!code || !state) {
      console.error("Missing URL parameters:", { code, state });
      return new Response("Missing URL parameters", { status: 400 });
    }

    if (!storedState || !codeVerifier) {
      console.error("Missing cookies:", {
        storedState: !!storedState,
        codeVerifier: !!codeVerifier,
        receivedCookies: cookies,
      });

      return new Response("Missing authentication cookies", { status: 400 });
    }

    if (state !== storedState) {
      console.error("State mismatch:", {
        received: state,
        stored: storedState,
      });

      return new Response("Invalid state parameter", { status: 400 });
    }

    let tokens: OAuth2Tokens;

    try {
      tokens = await google.validateAuthorizationCode(code, codeVerifier);
    } catch (error) {
      console.error(error);

      // Invalid code or client credentials
      return new Response("Invalid code or client credentials", {
        status: 400,
      });
    }

    const claims = decodeIdToken(tokens.idToken());

    // Clear the oauth state cookie
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "google_oauth_state=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    );

    try {
      const response = await fetch(`${env.API_URL}/auth/google/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claims }),
      });

      if (!response.ok) {
        console.error(await response.text());

        return new Response(null, {
          status: 400,
        });
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

      headers.append("Location", "/orgs");

      return new Response(null, {
        status: 302,
        headers,
      });
    } catch (error) {
      console.error(error);

      return new Response(null, {
        status: 400,
      });
    }
  },
});
