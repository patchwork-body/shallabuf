import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const config: TriggerConfig = {
  project: process.env.TRIGGER_PROJECT_ID!,
  triggerDirectories: ["./src"],
  logLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  dependenciesToBundle: [
    /drizzle-orm/,
    /\@vercel\/blob/,
    /\@lucia-auth\/adapter-drizzle/,
    /\@shallabuf\/turso/,
    /lucia/,
    /oslo/,
    /\@shallabuf\/logger/,
  ],
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
