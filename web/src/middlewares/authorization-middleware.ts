import { createMiddleware } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { getSessionToken } from "~/lib/session";

export const authorizationMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getWebRequest();

  if (!request) {
    throw new Error("No request found");
  }

  const sessionToken = getSessionToken(request);

  return next({
    context: {
      sessionToken,
    },
  })
});