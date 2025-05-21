import { config } from "dotenv";
import { object, string, pipe, url, parse, type InferOutput } from "valibot";

// Client-only environment variables (VITE_ prefixed)
const clientSchema = object({
  VITE_STRIPE_PUBLISHABLE_KEY: string(),
});

// Server-only environment variables
const serverSchema = object({
  API_URL: pipe(string(), url()),
  // GitHub OAuth
  GITHUB_CLIENT_ID: string(),
  GITHUB_CLIENT_SECRET: string(),
  GITHUB_REDIRECT_URI: pipe(string(), url()),
  // Google OAuth
  GOOGLE_CLIENT_ID: string(),
  GOOGLE_CLIENT_SECRET: string(),
  GOOGLE_REDIRECT_URI: pipe(string(), url()),
  // Stripe
  STRIPE_SECRET_KEY: string(),
});

type Env = InferOutput<typeof serverSchema> & InferOutput<typeof clientSchema>;
let env = {} as Env;

if (typeof window !== "undefined") {
  // Client-side: only parse VITE_ prefixed env vars
  const clientEnv = parse(clientSchema, import.meta.env);
  env = { ...clientEnv } as Env;
} else {
  // Server-side: parse all non-VITE_ env vars
  config();
  const serverEnv = parse(serverSchema, process.env);
  env = { ...serverEnv } as Env;
}

export { env };
