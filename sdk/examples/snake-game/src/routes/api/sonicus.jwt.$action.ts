import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { env } from '~/env';

interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export const APIRoute = createAPIFileRoute('/api/shallabuf/jwt/$action')({
  POST: async ({ request, params }) => {
    const { action } = params;

    if (action !== "issue" && action !== "refresh") {
      return json({ message: "Invalid action" }, { status: 400 });
    }

    let requestBody: unknown;

    if (action === "refresh") {
      const cookieHeader = request.headers.get("cookie");
      const refreshToken = cookieHeader
        ?.split(";")
        .find((c) => c.trim().startsWith("refresh_token="))
        ?.split("=")[1];

      if (!refreshToken) {
        return json({ message: "Unauthorized" }, { status: 401 });
      }

      requestBody = { refreshToken };
    } else {
      requestBody = { appId: env.SHALLABUF_APP_ID, payload: await request.json() };
    }

    const response = await fetch(`${env.SHALLABUF_API_URL}/jwt/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.SHALLABUF_APP_SECRET}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return json({ message: "Failed to process JWT request" }, { status: response.status });
    }

    const data: JwtResponse = await response.json();

    return json(data, {
      headers: {
        "Set-Cookie": `refresh_token=${data.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/shallabuf/jwt/refresh; Max-Age=${30 * 24 * 60 * 60}`,
      },
    });
  },
})
