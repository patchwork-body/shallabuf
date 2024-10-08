import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const config: TriggerConfig = {
  project: process.env.TRIGGER_PROJECT_ID!,
  logLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  dependenciesToBundle: [/.*/],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
};
