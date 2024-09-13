"use server";

import { authActionClient } from "@/actions";
import { createCardsSchema } from "@/lib/validation/create-card.schema";
import type { textToImageTask } from "@shallabuf/jobs/trigger/text-to-image";
import type { textToSpeechTask } from "@shallabuf/jobs/trigger/text-to-speech";
import { client as redisClient } from "@shallabuf/kv/client";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { tasks } from "@trigger.dev/sdk/v3";
import { generateIdFromEntropySize } from "lucia";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath, revalidateTag } from "next/cache";

export const createCards = authActionClient
  .schema(createCardsSchema)
  .metadata({
    name: "create-card",
    track: {
      channel: "cards",
      event: "create",
    },
  })
  .action(async ({ parsedInput: { cards, deckId } }) => {
    await Promise.all(
      cards.map(async (card) => {
        await createCard(card.front, card.back, deckId);
      }),
    );
  });

const createCard = async (front: string, back: string, deckId: string) => {
  const frontHex = Buffer.from(front).toString("hex");
  const backHex = Buffer.from(back).toString("hex");

  const frontAudio: string | null = await redisClient.get(`${frontHex}:audio`);
  const backAudio: string | null = await redisClient.get(`${backHex}:audio`);
  const image: string | null = await redisClient.get(`${frontHex}:image`);

  try {
    // TODO: insure that user has access to edit this deck
    const insertResult = await db
      .insert(cardTable)
      .values({
        id: generateIdFromEntropySize(10),
        front,
        back,
        frontAudio,
        backAudio,
        image,
        deckId,
      })
      .returning();

    const card = insertResult[0];

    if (!card) {
      returnValidationErrors(createCardsSchema, {
        _errors: ["Failed to create card"],
      });
    }

    const runs = [];

    if (!frontAudio) {
      const run = await tasks.trigger<typeof textToSpeechTask>(
        "text-to-speech",
        {
          fingerprint: `${card.id}:front`,
          text: card.front,
        },
      );

      runs.push(run.id);
    }

    if (!backAudio) {
      const run = await tasks.trigger<typeof textToSpeechTask>(
        "text-to-speech",
        {
          fingerprint: `${card.id}:back`,
          text: card.back,
        },
      );

      runs.push(run.id);
    }

    if (!image) {
      const run = await tasks.trigger<typeof textToImageTask>("text-to-image", {
        cardId: card.id,
        text: card.front,
      });

      runs.push(run.id);
    }

    await redisClient.set(`runs:${card.id}`, JSON.stringify(runs), {
      ex: 120,
    });

    revalidatePath("/decks");
    revalidateTag("id");

    return { card };
  } catch (error) {
    logger.error(error, "Failed to create card");

    if (error instanceof Error) {
      if (error.message.includes("SQLITE_CONSTRAINT")) {
        returnValidationErrors(createCardsSchema, {
          cards: [
            {
              _errors: ["Card with this name already exists"],
            },
          ],
        });
      }
    }

    returnValidationErrors(createCardsSchema, {
      _errors: ["Failed to create card"],
    });
  }
};
