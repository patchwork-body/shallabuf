"use server";

import { publicActionClient } from "@/actions";
import { keyTable, userTable } from "@/db/schema";
import { lucia } from "@/lib/lucia";
import { verify } from "@node-rs/argon2";
import { db } from "@shallabuf/turso";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { zfd } from "zod-form-data";

const schema = zfd.formData({
  email: zfd.text(z.string().email().max(256)),
  password: zfd.text(z.string().min(8).max(64)),
});

export const login = publicActionClient
  .schema(schema)
  .metadata({
    name: "login",
    track: {
      event: "login",
      channel: "auth",
    },
  })
  .action(async ({ parsedInput: { email, password } }) => {
    const user = (
      await db
        .select({
          id: userTable.id,
          passwordHash: keyTable.password,
        })
        .from(userTable)
        .leftJoin(keyTable, eq(userTable.id, keyTable.userId))
        .where(eq(userTable.email, email))
    )[0];

    if (!user) {
      return {
        error: "User not found",
      };
    }

    if (!user.passwordHash) {
      return {
        error: "User has no password",
      };
    }

    if (
      !(await verify(user.passwordHash, password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      }))
    ) {
      return {
        error: "Invalid password",
      };
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return redirect("/posts");
  });
