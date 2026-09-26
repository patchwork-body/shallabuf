import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
  SHALLABUF_APP_ID: z.string().min(1, 'SHALLABUF_APP_ID is required'),
  SHALLABUF_APP_SECRET: z.string().min(1, 'SHALLABUF_APP_SECRET is required'),
  SHALLABUF_API_URL: z.string().min(1, 'SHALLABUF_API_URL is required'),
})

const env = envSchema.parse({
  SHALLABUF_APP_ID: process.env.SHALLABUF_APP_ID,
  SHALLABUF_APP_SECRET: process.env.SHALLABUF_APP_SECRET,
  SHALLABUF_API_URL: process.env.SHALLABUF_API_URL,
})

export { env }
