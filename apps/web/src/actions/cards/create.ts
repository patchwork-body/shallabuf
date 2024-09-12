"use server";

import { authActionClient } from "@/actions";
import { createCardSchema } from "@/lib/validation/create-card.schema";
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
    const frontHex = Buffer.from(front).toString("hex");
    const backHex = Buffer.from(back).toString("hex");

    const frontAudio: string | null = await redisClient.get(
      `${frontHex}:audio`,
    );
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
        returnValidationErrors(createCardSchema, {
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
        const run = await tasks.trigger<typeof textToImageTask>(
          "text-to-image",
          {
            cardId: card.id,
            text: card.front,
          },
        );

        runs.push(run.id);
      }

      await redisClient.set(`runs:${card.id}`, JSON.stringify(runs), {
        ex: 3600,
      });

      revalidatePath("/decks");
      revalidateTag("id");

      return { card };
    } catch (error) {
      logger.error(error, "Failed to create card");

      if (error instanceof Error) {
        if (error.message.includes("SQLITE_CONSTRAINT")) {
          returnValidationErrors(createCardSchema, {
            front: {
              _errors: ["Card with this name already exists"],
            },
          });
        }
      }

      returnValidationErrors(createCardSchema, {
        _errors: ["Failed to create card"],
      });
    }
  });

// const getAudioUrl = async (
//   text: string,
//   onSuccess: (audioUrl: string) => Promise<void>,
// ) => {
//   const stream = await textToSpeech(text);
//   const buffer = await streamToBuffer(stream);

//   const result = await put(
//     `${Buffer.from(text, "utf8").toString("hex")}.mp3`,
//     buffer,
//     { access: "public" },
//   );

//   await onSuccess(result.url);
// };

// const getImageUrl = async (
//   text: string,
//   onSuccess: (imageUrl: string) => Promise<void>,
// ) => {
//   const b64_json = await textToImage(text);

//   const buffer = Buffer.from(b64_json, "base64");

//   const result = await put(
//     `${Buffer.from(text, "utf8").toString("hex")}.png`,
//     buffer,
//     { access: "public" },
//   );

//   logger.info(result.url, "Image URL");

//   await onSuccess(result.url);
// };
