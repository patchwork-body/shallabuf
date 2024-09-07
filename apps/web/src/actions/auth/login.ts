"use server";

import { publicActionClient } from "@/actions";
import { keyTable, userTable } from "@/db/schema";
import { lucia } from "@/lib/lucia";
import { loginSchema } from "@/lib/validation";
import { verify } from "@node-rs/argon2";
import { db } from "@shallabuf/turso";
import { eq } from "drizzle-orm";
import { returnValidationErrors } from "next-safe-action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const login = publicActionClient
  .schema(loginSchema)
  .metadata({
    name: "login",
    track: {
      event: "login",
      channel: "auth",
    },
  })
  .action(async ({ parsedInput: { email, password } }) => {
    const result = await db
      .select({
        id: userTable.id,
        passwordHash: keyTable.password,
      })
      .from(userTable)
      .leftJoin(keyTable, eq(userTable.id, keyTable.userId))
      .where(eq(userTable.email, email));

    const user = result[0];

    if (!user) {
      returnValidationErrors(loginSchema, {
        email: {
          _errors: ["There's no user with this email"],
        },
      });
    }

    if (!user.passwordHash) {
      returnValidationErrors(loginSchema, {
        _errors: ["User has no password"],
      });
    }

    if (
      !(await verify(user.passwordHash, password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      }))
    ) {
      returnValidationErrors(loginSchema, {
        _errors: ["Username or password is incorrect"],
        email: {
          _errors: ["Invalid email"],
        },
        password: {
          _errors: ["Invalid password"],
        },
      });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return redirect("/decks");
  });
