import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "../index";
import {
  object,
  string,
  uuid,
  number,
  minValue,
  maxValue,
  optional,
  pipe,
  minLength,
  maxLength,
  array,
  email,
  boolean,
} from "valibot";
import {
  createOrganizationSchema,
  inviteResponseSchema,
  listMembersAndInvitesResponseSchema,
  listOrganizationsResponseSchema,
  organizationSchema,
} from "~/lib/schemas";

export const orgsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createOrganizationSchema)
    .output(organizationSchema)
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(`${env.API_URL}/orgs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.sessionToken}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to create organization");
      }

      return response.json();
    }),

  list: protectedProcedure
    .input(
      object({
        cursor: optional(pipe(string(), uuid())),
        limit: optional(pipe(number(), minValue(1), maxValue(100))),
      })
    )
    .output(listOrganizationsResponseSchema)
    .query(async ({ input, ctx }) => {
      const params = new URLSearchParams();
      if (input.cursor) params.set("cursor", input.cursor);
      if (input.limit) params.set("limit", input.limit.toString());

      try {
        const response = await fetch(
          `${env.API_URL}/orgs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${ctx.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch organizations");
        }

        return await response.json();
      } catch (error) {
        console.error(error);
        return { organizations: [], nextCursor: null };
      }
    }),

  get: protectedProcedure
    .input(object({ id: pipe(string(), uuid()) }))
    .output(organizationSchema)
    .query(async ({ input, ctx }) => {
      const response = await fetch(`${env.API_URL}/orgs/${input.id}`, {
        headers: {
          Authorization: `Bearer ${ctx.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch organization");
      }

      return response.json();
    }),

  update: protectedProcedure
    .input(
      object({
        id: pipe(string(), uuid()),
        name: pipe(string(), minLength(1), maxLength(255)),
      })
    )
    .output(organizationSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const response = await fetch(`${env.API_URL}/orgs/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update organization");
      }

      return response.json();
    }),

  delete: protectedProcedure
    .input(object({ id: pipe(string(), uuid()) }))
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(`${env.API_URL}/orgs/${input.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${ctx.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete organization");
      }

      return true;
    }),

  inviteMembers: protectedProcedure
    .input(
      object({
        emails: array(pipe(string(), email())),
        organizationId: pipe(string(), uuid()),
      })
    )
    .output(inviteResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(
        `${env.API_URL}/orgs/${input.organizationId}/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ctx.sessionToken}`,
          },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        console.error(await response.text());
        throw new Error("Failed to invite member");
      }

      return await response.json();
    }),

  revokeInvite: protectedProcedure
    .input(
      object({
        organizationId: pipe(string(), uuid()),
        inviteId: pipe(string(), uuid()),
      })
    )
    .output(
      object({
        success: boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(
        `${env.API_URL}/orgs/${input.organizationId}/invites/${input.inviteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${ctx.sessionToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.log(await response.text());
        throw new Error("Failed to revoke invite");
      }

      return response.json();
    }),

  resendInvite: protectedProcedure
    .input(
      object({
        organizationId: pipe(string(), uuid()),
        inviteId: pipe(string(), uuid()),
      })
    )
    .output(inviteResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const response = await fetch(
        `${env.API_URL}/orgs/${input.organizationId}/invites/${input.inviteId}/resend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ctx.sessionToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.log(await response.text());
        throw new Error("Failed to resend invite");
      }

      return response.json();
    }),

  listMembersAndInvites: protectedProcedure
    .input(
      object({
        organizationId: pipe(string(), uuid()),
      })
    )
    .output(listMembersAndInvitesResponseSchema)
    .query(async ({ input, ctx }) => {
      const invitesRes = await fetch(
        `${env.API_URL}/orgs/${input.organizationId}/invites`,
        {
          headers: {
            Authorization: `Bearer ${ctx.sessionToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!invitesRes.ok) {
        throw new Error("Failed to list members and invites");
      }

      const invites = await invitesRes.json();

      const membersRes = await fetch(
        `${env.API_URL}/orgs/${input.organizationId}/members`,
        {
          headers: {
            Authorization: `Bearer ${ctx.sessionToken}`,
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
    }),
});
