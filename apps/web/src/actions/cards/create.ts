"use server";

import { authActionClient } from "@/actions";
import { cardTable, deckTable } from "@/db/schema";
import { createCardSchema } from "@/lib/validation/create-card.schema";
import { createDeckSchema } from "@/lib/validation/create-deck.schema";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { generateIdFromEntropySize } from "lucia";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath, revalidateTag } from "next/cache";

export const createCard = authActionClient
  .schema(createCardSchema)
  .metadata({
    name: "create-card",
    track: {
      channel: "cards",
      event: "create",
    },
  })
  .action(async ({ parsedInput: { front, back, deckId } }) => {
    try {
      const card = await db.insert(cardTable).values({
        id: generateIdFromEntropySize(10),
        front,
        back,
        deckId,
      });

      revalidatePath("/decks");
      revalidateTag("id");

      return {
        card,
      };
    } catch (error) {
      logger.error(error, "Failed to create card");

      if (error instanceof Error) {
        if (error.message.includes("SQLITE_CONSTRAINT")) {
          returnValidationErrors(createDeckSchema, {
            name: {
              _errors: ["Card with this name already exists"],
            },
          });
        }
      }

      returnValidationErrors(createDeckSchema, {
        _errors: ["Failed to create card"],
      });
    }
  });
