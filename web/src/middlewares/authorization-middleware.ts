import { createMiddleware } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { getSessionToken } from "~/lib/session";

export const authorizationMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getWebRequest();

  if (!request) {
    throw new Error("No request found");
  }

  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    throw new Error("No session token found");
  }

  return next({
    context: {
      sessionToken,
    },
  })
});