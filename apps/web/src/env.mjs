import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    VERCEL_URL: z
      .string()
      .optional()
      .transform((v) => (v ? `https://${v}` : undefined)),
    PORT: z.coerce.number().default(3000),
  },
  server: {
    OPENPANEL_SECRET_KEY: z.string(),
    // RESEND_API_KEY: z.string(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    UPSTASH_REDIS_REST_URL: z.string(),
  },
  client: {
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID: z.string(),
  },
  runtimeEnv: {
    TURSO_DATABASE_URL: z.string().url(),
    TURSO_AUTH_TOKEN: z.string(),
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    OPENPANEL_SECRET_KEY: process.env.OPENPANEL_SECRET_KEY,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    TRIGGER_PROJECT_ID: process.env.TRIGGER_PROJECT_ID,
    PORT: process.env.PORT,
    // RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    VERCEL_URL: process.env.VERCEL_URL,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});
