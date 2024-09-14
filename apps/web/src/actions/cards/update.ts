"use server";

import { authActionClient } from "@/actions";
import { toMatchableHex } from "@/helpers/to-matchable-hex";
import { updateCardSchema } from "@/lib/validation/update-card.schema";
import type { textToImageTask } from "@shallabuf/jobs/trigger/text-to-image";
import type { textToSpeechTask } from "@shallabuf/jobs/trigger/text-to-speech";
import { client as redisClient } from "@shallabuf/kv/client";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { tasks } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { returnValidationErrors } from "next-safe-action";
import { revalidatePath, revalidateTag } from "next/cache";

export const updateCardAction = authActionClient
  .schema(updateCardSchema)
  .metadata({
    name: "update-card",
    track: {
      channel: "cards",
      event: "update",
    },
  })
  .action(async ({ parsedInput: { front, back, cardId } }) => {
    const frontHex = toMatchableHex(front);
    const backHex = toMatchableHex(back);

    const frontAudio: string | null = await redisClient.get(
      `audio:${frontHex}`,
    );
    const backAudio: string | null = await redisClient.get(`audio:${backHex}`);
    const image: string | null = await redisClient.get(`image:${frontHex}`);

    try {
      // TODO: insure that user has access to edit this card
      const updateResult = await db
        .update(cardTable)
        .set({
          front,
          back,
          frontAudio,
          backAudio,
          image,
        })
        .where(eq(cardTable.id, cardId))
        .returning();

      const card = updateResult[0];

      if (!card) {
        returnValidationErrors(updateCardSchema, {
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

      if (runs.length > 0) {
        await redisClient.set(`runs:${card.id}`, JSON.stringify(runs), {
          ex: 120,
        });
      }

      revalidatePath("/decks");
      revalidateTag("id");

      return { card };
    } catch (error) {
      logger.error(error, "Failed to update card");

      if (error instanceof Error) {
        if (error.message.includes("SQLITE_CONSTRAINT")) {
          returnValidationErrors(updateCardSchema, {
            _errors: ["Card with this name already exists"],
          });
        }
      }

      returnValidationErrors(updateCardSchema, {
        _errors: ["Failed to update card"],
      });
    }
  });
