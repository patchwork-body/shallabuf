"use server";

import { authActionClient } from "@/actions";
import { createDeckSchema } from "@/lib/validation/create-deck.schema";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { deckTable } from "@shallabuf/turso/schema";
import { generateIdFromEntropySize } from "lucia";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath } from "next/cache";

export const createDeckAction = authActionClient
  .schema(createDeckSchema)
  .metadata({
    name: "create-deck",
    track: {
      channel: "decks",
      event: "create",
    },
  })
  .action(async ({ parsedInput: { name }, ctx: { user, ratelimit } }) => {
    try {
      const insertResult = await db
        .insert(deckTable)
        .values({ id: generateIdFromEntropySize(10), name, userId: user.id })
        .returning();

      const deck = insertResult[0];

      if (!deck) {
        returnValidationErrors(createDeckSchema, {
          _errors: ["Failed to create a deck"],
        });
      }

      revalidatePath("/decks");

      return { deck };
    } catch (error) {
      logger.error(error, "Failed to create deck");

      if (error instanceof Error) {
        if (error.message.includes("SQLITE_CONSTRAINT")) {
          returnValidationErrors(createDeckSchema, {
            name: {
              _errors: ["Deck with this name already exists"],
            },
          });
        }
      }

      returnValidationErrors(createDeckSchema, {
        _errors: ["Failed to create deck"],
      });
    }
  });
