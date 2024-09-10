"use server";

import { authActionClient } from "@/actions";
import { cardTable } from "@/db/schema";
import { streamToBuffer } from "@/helpers/stream-to-buffer";
import { textToImage } from "@/helpers/text-to-image";
import { textToSpeech } from "@/helpers/text-to-speech";
import { createCardSchema } from "@/lib/validation/create-card.schema";
import { createDeckSchema } from "@/lib/validation/create-deck.schema";
import type { textToSpeechTask } from "@/trigger/text-to-speech";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { tasks } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
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
      const insertResult = await db
        .insert(cardTable)
        .values({
          id: generateIdFromEntropySize(10),
          front,
          back,
          deckId,
        })
        .returning();

      const card = insertResult[0];

      if (!card) {
        returnValidationErrors(createDeckSchema, {
          _errors: ["Failed to create card"],
        });
      }

      await Promise.all([
        getAudioUrl(card.front, async (url) => {
          await db
            .update(cardTable)
            .set({ frontAudio: url })
            .where(eq(cardTable.id, card.id));
        }),

        getAudioUrl(card.back, async (url) => {
          await db
            .update(cardTable)
            .set({ backAudio: url })
            .where(eq(cardTable.id, card.id));
        }),

        getImageUrl(card.front, async (url) => {
          await db
            .update(cardTable)
            .set({ image: url })
            .where(eq(cardTable.id, card.id));
        }),
      ]);

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

const getAudioUrl = async (
  text: string,
  onSuccess: (audioUrl: string) => Promise<void>,
) => {
  const stream = await textToSpeech(text);
  const buffer = await streamToBuffer(stream);

  const result = await put(
    `${Buffer.from(text, "utf8").toString("hex")}.mp3`,
    buffer,
    { access: "public" },
  );

  await onSuccess(result.url);
};

const getImageUrl = async (
  text: string,
  onSuccess: (imageUrl: string) => Promise<void>,
) => {
  const b64_json = await textToImage(text);

  const buffer = Buffer.from(b64_json, "base64");

  const result = await put(
    `${Buffer.from(text, "utf8").toString("hex")}.png`,
    buffer,
    { access: "public" },
  );

  logger.info(result.url, "Image URL");

  await onSuccess(result.url);
};
