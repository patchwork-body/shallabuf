"use server";

import { publicActionClient } from "@/actions";
import { lucia } from "@/lib/lucia";
import { signupSchema } from "@/lib/validation/signup.schema";
import { hash } from "@node-rs/argon2";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { keyTable, userTable } from "@shallabuf/turso/schema";
import { generateIdFromEntropySize } from "lucia";
import { returnValidationErrors } from "next-safe-action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const signup = publicActionClient
  .schema(signupSchema)
  .metadata({
    name: "signup",
    track: {
      event: "signup",
      channel: "auth",
    },
  })
  .action(async ({ parsedInput: { email, password } }) => {
    let passwordHash: string;
    try {
      passwordHash = await hash(password, {
        // Recommended minimum parameters
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });
    } catch (error) {
      logger.error(error, "Error hashing password");

      returnValidationErrors(signupSchema, {
        password: {
          _errors: ["Password is invalid"],
        },
      });
    }

    let userId: string | undefined;

    try {
      const result = await db
        .insert(userTable)
        .values({
          id: generateIdFromEntropySize(10),
          name: email.split("@")[0] ?? email,
          email,
        })
        .returning({ id: userTable.id });

      userId = result[0]?.id;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("SQLITE_CONSTRAINT")) {
          returnValidationErrors(signupSchema, {
            email: {
              _errors: ["Email already exists"],
            },
          });
        }
      }

      returnValidationErrors(signupSchema, {
        email: {
          _errors: ["Email is invalid"],
        },
      });
    }

    if (!userId) {
      returnValidationErrors(signupSchema, {
        email: {
          _errors: ["Email is invalid"],
        },
      });
    }

    await db.insert(keyTable).values({
      id: generateIdFromEntropySize(10),
      userId,
      password: passwordHash,
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return redirect("/decks");
  });
