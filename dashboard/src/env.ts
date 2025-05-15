import { config } from 'dotenv'
import { z } from 'zod'


const envSchema = z.object({
  API_URL: z.string().url(),
})

let env: z.infer<typeof envSchema>;

if (typeof window !== 'undefined') {
  env = envSchema.parse(import.meta.env)
} else {
  config()
  env = envSchema.parse(process.env)
}

export { env }
