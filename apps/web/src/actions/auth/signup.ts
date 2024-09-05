"use server";

import { publicActionClient } from "@/actions";
import { keyTable, userTable } from "@/db/schema";
import { lucia } from "@/lib/lucia";
import { hash } from "@node-rs/argon2";
import { db } from "@shallabuf/turso";
import { generateIdFromEntropySize } from "lucia";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { zfd } from "zod-form-data";

const schema = zfd.formData({
  email: zfd.text(z.string().email().max(256)),
  password: zfd.text(z.string().min(8).max(64)),
});

export const signup = publicActionClient
  .schema(schema)
  .metadata({
    name: "signup",
    track: {
      event: "signup",
      channel: "auth",
    },
  })
  .action(async ({ parsedInput: { email, password } }) => {
    const passwordHash = await hash(password, {
      // Recommended minimum parameters
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const result = await db
      .insert(userTable)
      .values({
        id: generateIdFromEntropySize(10),
        email,
      })
      .returning({ id: userTable.id });

    const userId = result[0]?.id;

    if (!userId) {
      return {
        error: "Failed to create user",
      };
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

    return redirect("/posts");
  });
