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
  boolean,
} from "valibot";

export const loginSchema = object({
  email: pipe(string(), email()),
  password: pipe(string(), minLength(8)),
});

export type Login = InferOutput<typeof loginSchema>;

export const sessionSchema = object({
  id: string(),
  username: string(),
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
  billingConnected: boolean(),
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

export const listOrganizationsResponseSchema = object({
  organizations: array(organizationSchema),
  nextCursor: nullable(string()),
});

export type ListOrganizationsResponse = InferOutput<
  typeof listOrganizationsResponseSchema
>;

export const createPaymentIntentSchema = object({
  organizationId: pipe(string(), uuid()),
});

export type CreatePaymentIntent = InferOutput<typeof createPaymentIntentSchema>;

export const createPaymentIntentResponseSchema = object({
  clientSecret: string(),
});

export type CreatePaymentIntentResponse = InferOutput<
  typeof createPaymentIntentResponseSchema
>;

export const getPaymentIntentSchema = object({
  organizationId: pipe(string(), uuid()),
});

export type GetPaymentIntent = InferOutput<typeof getPaymentIntentSchema>;

export const paymentIntentInfoSchema = object({
  paymentIntentId: string(),
  paymentMethodId: string(),
  clientSecret: string(),
});

export type GetPaymentIntentResponse = InferOutput<
  typeof paymentIntentInfoSchema
>;

export const updatePaymentIntentSchema = object({
  organizationId: pipe(string(), uuid()),
  paymentMethodId: pipe(string(), minLength(1)),
});

export type UpdatePaymentIntent = InferOutput<typeof updatePaymentIntentSchema>;

export const createPortalSessionSchema = object({
  organizationId: pipe(string(), uuid()),
  returnUrl: optional(string()),
});

export type CreatePortalSession = InferOutput<typeof createPortalSessionSchema>;

export const createPortalSessionResponseSchema = object({
  url: string(),
});

export type CreatePortalSessionResponse = InferOutput<typeof createPortalSessionResponseSchema>;

export const inviteSchema = object({
  id: pipe(string(), uuid()),
  email: string(),
  status: string(),
  expiresAt: string(),
  createdAt: string(),
});

export type Invite = InferOutput<typeof inviteSchema>;

export const inviteResponseSchema = array(inviteSchema);

export type InviteResponse = InferOutput<typeof inviteResponseSchema>;

export const memberSchema = object({
  id: string(),
  name: string(),
  email: string(),
});

export const listMembersAndInvitesResponseSchema = object({
  members: array(memberSchema),
  invites: array(inviteSchema),
});

export type ListMembersAndInvitesResponse = InferOutput<typeof listMembersAndInvitesResponseSchema>;