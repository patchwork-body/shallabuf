"use server";

import { authActionClient } from "@/actions";
import { deleteCardSchema } from "@/lib/validation/delete-card.schema";
import { updateCardSchema } from "@/lib/validation/update-card.schema";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { eq } from "drizzle-orm";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath, revalidateTag } from "next/cache";

export const deleteCardAction = authActionClient
  .schema(deleteCardSchema)
  .metadata({
    name: "delete-card",
    track: {
      channel: "cards",
      event: "delete",
    },
  })
  .action(async ({ parsedInput: { cardId } }) => {
    try {
      // TODO: insure that user has access to edit this card
      const deleteResult = await db
        .delete(cardTable)
        .where(eq(cardTable.id, cardId))
        .returning({ id: cardTable.id });

      const card = deleteResult[0];

      if (!card) {
        returnValidationErrors(updateCardSchema, {
          _errors: ["Failed to delete card"],
        });
      }

      revalidatePath("/decks");
      revalidateTag("id");

      return { id: card.id };
    } catch (error) {
      logger.error(error, "Failed to delete card");

      returnValidationErrors(updateCardSchema, {
        _errors: ["Failed to delete card"],
      });
    }
  });
