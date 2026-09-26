import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";

import dotenv from "dotenv";
import { env } from "bun";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  async fetch(req: Request) {
    const url = new URL(req.url);
    const reqType = url.pathname.split("/").pop();

    if (
      req.method === "POST" &&
      (reqType === "issue" || reqType === "refresh")
    ) {
      let requestBody: unknown;

      if (reqType === "refresh") {
        const cookieHeader = req.headers.get("cookie");
        const refreshToken = cookieHeader
          ?.split(";")
          .find((c) => c.trim().startsWith("refresh_token="))
          ?.split("=")[1];

        if (!refreshToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        requestBody = { refreshToken };
      } else {
        requestBody = { appId: env.SHALLABUF_APP_ID, payload: await req.json() };
      }

      const response = await fetch(`http://localhost:8000/api/v0/jwt/${reqType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.SHALLABUF_APP_SECRET}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return new Response("Failed to process JWT request", {
          status: response.status,
        });
      }

      const data: JwtResponse = await response.json();

      const jsonResponse = new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `refresh_token=${
            data.refreshToken
          }; HttpOnly; Secure; SameSite=Strict; Path=/api/shallabuf/jwt/refresh; Max-Age=${
            30 * 24 * 60 * 60
          }`,
        },
      });

      return jsonResponse;
    }

    // Handle static files
    if (url.pathname === "/") {
      const html = await readFile(join(__dirname, "../dist/index.html"), "utf-8");
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/styles.css") {
      const css = await readFile(join(__dirname, "../dist/styles.css"), "utf-8");
      return new Response(css, {
        headers: { "Content-Type": "text/css" },
      });
    }

    if (url.pathname === "/dist/main.js") {
      const js = await readFile(join(__dirname, "../dist/main.js"), "utf-8");
      return new Response(js, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});
