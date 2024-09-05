import { cookies } from "next/headers";

import { lucia } from "@/lib/lucia";
import { logger } from "@shallabuf/logger";
import type { Session, User } from "lucia";

// This function designed to be used in the middleware therefore cannot be cached
// due to the limitations of the edge environment
export const validateSessionMiddleware = async (): Promise<
  { user: User; session: Session } | { user: null; session: null }
> => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);

  try {
    if (result.session?.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);

      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
    }

    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();

      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
    }
  } catch (error) {
    // next.js throws when you attempt to set cookie when rendering page
    if (error instanceof Error) {
      logger.error(`Failed to refresh session ${error.message}`);
    }

    logger.error("Unknown error occurred while refreshing session");
  }

  return result;
};
