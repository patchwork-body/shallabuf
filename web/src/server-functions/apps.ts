import { createServerFn } from "@tanstack/react-start";
import {
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
  uuid,
} from "valibot";
import { env } from "~/env";
import {
  CreateAppResponse,
  createAppSchema,
  EditAppResponse,
  editAppSchema,
  ListAppsResponse,
} from "~/lib/schemas";
import { authorizationMiddleware } from "~/middlewares/authorization-middleware";

export const appsListFn = createServerFn({
  method: "GET",
})
  .validator(
    object({
      organizationId: pipe(string(), uuid()),
      cursor: nullable(pipe(string(), uuid())),
      limit: optional(number()),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<ListAppsResponse>(async ({ data, context }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("organizationId", data.organizationId);

    if (data.cursor) {
      searchParams.set("cursor", data.cursor);
    }

    if (data.limit) {
      searchParams.set("limit", data.limit.toString());
    }

    try {
      const response = await fetch(
        `${env.API_URL}/apps?${searchParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${context.sessionToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to list apps");
      }

      return await response.json();
    } catch (error) {
      throw new Error("Failed to list apps");
    }
  });

export const appsCreateFn = createServerFn({
  method: "POST",
})
  .validator(createAppSchema)
  .middleware([authorizationMiddleware])
  .handler<CreateAppResponse>(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/apps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return await response.json();
  });

export const appsEditFn = createServerFn({
  method: "POST",
})
  .validator(editAppSchema)
  .middleware([authorizationMiddleware])
  .handler<EditAppResponse>(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/apps/${data.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return await response.json();
  });

export const appsDeleteFn = createServerFn({
  method: "POST",
})
  .validator(object({ id: pipe(string(), uuid()) }))
  .middleware([authorizationMiddleware])
  .handler(async ({ data, context }) => {
    const response = await fetch(`${env.API_URL}/apps/${data.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.sessionToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return { success: true };
  });
