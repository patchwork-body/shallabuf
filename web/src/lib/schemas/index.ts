import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type Login = z.infer<typeof loginSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  expiresAt: z.string(),
});

export type Session = z.infer<typeof sessionSchema>;

export const appInfoSchema = z.object({
  appId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(), // OffsetDateTime will be serialized as ISO string
});

export type AppInfo = z.infer<typeof appInfoSchema>;

export const listAppsResponseSchema = z.object({
  apps: z.array(appInfoSchema),
  nextCursor: z.string().nullable(),
});

export type ListAppsResponse = z.infer<typeof listAppsResponseSchema>;

export const createAppSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
});

export type CreateApp = z.infer<typeof createAppSchema>;

export const createAppResponseSchema = z.object({
  appId: z.string(),
  appSecret: z.string(),
});

export type CreateAppResponse = z.infer<typeof createAppResponseSchema>;
