import { createStart } from "@tanstack/react-start";
import { logMiddleware } from "./middlewares/logging-middleware";

export const startInstance = createStart(() => ({
  functionMiddleware: [logMiddleware],
}));
