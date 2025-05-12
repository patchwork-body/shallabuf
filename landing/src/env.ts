import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
  SONICUS_APP_ID: z.string().min(1, 'SONICUS_APP_ID is required'),
  SONICUS_APP_SECRET: z.string().min(1, 'SONICUS_APP_SECRET is required'),
  SONICUS_API_URL: z.string().min(1, 'SONICUS_API_URL is required'),
})

const env = envSchema.parse({
  SONICUS_APP_ID: process.env.SONICUS_APP_ID,
  SONICUS_APP_SECRET: process.env.SONICUS_APP_SECRET,
  SONICUS_API_URL: process.env.SONICUS_API_URL,
})

export { env }
