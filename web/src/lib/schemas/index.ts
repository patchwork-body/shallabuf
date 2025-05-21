import {
  object,
  string,
  array,
  minLength,
  maxLength,
  email,
  nullable,
  optional,
  type InferOutput,
  pipe,
  uuid,
} from "valibot";

export const loginSchema = object({
  email: pipe(string(), email()),
  password: pipe(string(), minLength(8)),
});

export type Login = InferOutput<typeof loginSchema>;

export const sessionSchema = object({
  id: string(),
  expiresAt: string(),
});

export type Session = InferOutput<typeof sessionSchema>;

export const appInfoSchema = object({
  appId: string(),
  name: string(),
  description: nullable(string()),
  createdAt: string(),
});

export type AppInfo = InferOutput<typeof appInfoSchema>;

export const listAppsResponseSchema = object({
  apps: array(appInfoSchema),
  nextCursor: nullable(string()),
});

export type ListAppsResponse = InferOutput<typeof listAppsResponseSchema>;

export const createAppSchema = object({
  organizationId: pipe(string(), uuid()),
  name: pipe(
    string(),
    minLength(1, "Name is required"),
    maxLength(50, "Name must be less than 50 characters")
  ),
  description: optional(
    pipe(
      string(),
      maxLength(200, "Description must be less than 200 characters")
    )
  ),
});

export type CreateApp = InferOutput<typeof createAppSchema>;

export const createAppResponseSchema = object({
  appId: string(),
  appSecret: string(),
});

export type CreateAppResponse = InferOutput<typeof createAppResponseSchema>;

export const editAppSchema = object({
  appId: string(),
  name: optional(string()),
  description: optional(string()),
});

export type EditApp = InferOutput<typeof editAppSchema>;

export const editAppResponseSchema = object({
  appId: string(),
  name: string(),
  description: nullable(string()),
});

export type EditAppResponse = InferOutput<typeof editAppResponseSchema>;

export const organizationSchema = object({
  id: string(),
  name: string(),
  createdAt: string(),
  updatedAt: string(),
});

export type Organization = InferOutput<typeof organizationSchema>;

export const createOrganizationSchema = object({
  name: pipe(string(), minLength(1), maxLength(255)),
});

export type CreateOrganization = InferOutput<typeof createOrganizationSchema>;

export const updateOrganizationSchema = object({
  name: pipe(string(), minLength(1), maxLength(255)),
});

export type UpdateOrganization = InferOutput<typeof updateOrganizationSchema>;
