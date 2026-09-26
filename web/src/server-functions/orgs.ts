import { createServerFn } from "@tanstack/react-start";
import {
  object,
  optional,
  pipe,
  string,
  uuid,
  number,
  minValue,
  maxValue,
  nullable,
  email,
  array,
  minLength,
} from "valibot";
import { env } from "~/env";
import {
  createOrganizationSchema,
  InviteResponse,
  ListMembersAndInvitesResponse,
  ListOrganizationsResponse,
  Organization,
} from "~/lib/schemas";
import { authorizationMiddleware } from "~/middlewares/authorization-middleware";

export const orgsListFn = createServerFn({
  method: "GET",
})
  .middleware([authorizationMiddleware])
  .validator(
    object({
      cursor: nullable(pipe(string(), uuid())),
      limit: optional(pipe(number(), minValue(1), maxValue(100))),
    })
  )
  .handler<ListOrganizationsResponse>(async ({ data, context }) => {
    const params = new URLSearchParams();
    if (data.cursor) params.set("cursor", data.cursor);
    if (data.limit) params.set("limit", data.limit.toString());

    try {
      const response = await fetch(`${env.API_URL}/orgs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }

      return await response.json();
    } catch (error) {
      console.error(error);
      return { organizations: [], nextCursor: null };
    }
  });

export const orgsCreateFn = createServerFn({
  method: "POST",
})
  .validator(createOrganizationSchema)
  .middleware([authorizationMiddleware])
  .handler(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/orgs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create organization");
    }

    return response.json();
  });

export const orgsGetFn = createServerFn({
  method: "GET",
})
  .validator(object({ id: pipe(string(), uuid()) }))
  .middleware([authorizationMiddleware])
  .handler<Organization>(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/orgs/${data.id}`, {
      headers: {
        Authorization: `Bearer ${context.sessionToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch organization");
    }

    return response.json();
  });

export const orgsUpdateFn = createServerFn({
  method: "POST",
})
  .validator(object({ id: pipe(string(), uuid()), name: pipe(string(), minLength(1)) }))
  .middleware([authorizationMiddleware])
  .handler(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/orgs/${data.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update organization");
    }

    return response.json();
  });

export const orgsListMembersAndInvitesFn = createServerFn({
  method: "GET",
})
  .validator(object({ organizationId: pipe(string(), uuid()) }))
  .middleware([authorizationMiddleware])
  .handler<ListMembersAndInvitesResponse>(async ({ data, context }) => {
    const invitesRes = await fetch(
      `${env.API_URL}/orgs/${data.organizationId}/invites`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!invitesRes.ok) {
      throw new Error("Failed to list members and invites");
    }

    const invites = await invitesRes.json();

    const membersRes = await fetch(
      `${env.API_URL}/orgs/${data.organizationId}/members`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!membersRes.ok) {
      throw new Error("Failed to list members");
    }

    const members = await membersRes.json();

    return {
      members,
      invites,
    };
  });

export const orgsInviteMembersFn = createServerFn({
  method: "POST",
})
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
      emails: array(pipe(string(), email())),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<InviteResponse>(async ({ data, context }) => {
    const response = await fetch(
      `${env.API_URL}/orgs/${data.organizationId}/invites`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.sessionToken}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      console.error(await response.text());
      throw new Error("Failed to invite member");
    }

    return await response.json();
  });

export const orgsResendInviteFn = createServerFn({
  method: "POST",
})
  .validator(object({ organizationId: pipe(string(), uuid()), inviteId: pipe(string(), uuid()) }))
  .middleware([authorizationMiddleware])
  .handler(async ({ data, context }) => {
     const response = await fetch(
        `${env.API_URL}/orgs/${data.organizationId}/invites/${data.inviteId}/resend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${context.sessionToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.log(await response.text());
        throw new Error("Failed to resend invite");
      }

      return response.json();
  });

export const orgsRevokeInviteFn = createServerFn({
  method: "POST",
})
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
      inviteId: pipe(string(), uuid()),
    })
  )
  .middleware([authorizationMiddleware])
  .handler(async ({ data, context }) => {
    const response = await fetch(
      `${env.API_URL}/orgs/${data.organizationId}/invites/${data.inviteId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.log(await response.text());
      throw new Error("Failed to revoke invite");
    }

    return response.json();
  });

export const orgsDeleteFn = createServerFn({
  method: "POST",
})
  .validator(object({ id: pipe(string(), uuid()) }))
  .middleware([authorizationMiddleware])
  .handler(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/orgs/${data.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${context.sessionToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return { success: true };
  });
