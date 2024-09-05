import { cache } from "react";
import "server-only";
import { validateSessionMiddleware } from "./validate-session-middleware";

export const validateSession = cache(validateSessionMiddleware);
