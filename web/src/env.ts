import { config } from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  API_URL: z.string().url(),
  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_REDIRECT_URI: z.string().url(),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string().url(),
});

let env: z.infer<typeof envSchema>;

if (typeof window !== "undefined") {
  env = envSchema.parse(import.meta.env);
} else {
  config();
  env = envSchema.parse(process.env);
}

export { env };
