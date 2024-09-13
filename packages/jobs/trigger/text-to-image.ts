import { client as redisClient } from "@shallabuf/kv/client";
import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { task } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";

const PLACEHOLDER_URL =
  "https://u6bcvqybmhi1escu.public.blob.vercel-storage.com/436f6e74656e7420686173206265656e2063656e736f726564-PgcgYbMqbzKn1XpDc3ULPhR6odJxhu.png";

export type TextToImagePayload = {
  cardId: string;
  text: string;
};

export const textToImageTask = task({
  id: "text-to-image",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: TextToImagePayload, { ctx: { attempt } }) => {
    const response = await textToImage(payload.text);
    const b64_json = (await response.json()).data?.[0]?.b64_json;

    if (!b64_json) {
      if (attempt.number < 3) {
        throw new Error("No image data returned");
      }

      throw new Error("Failed to generate image");
    }

    const buffer = Buffer.from(b64_json, "base64");
    const textHex = toMatchableHex(payload.text);
    const result = await put(`${textHex}.png`, buffer, { access: "public" });
    await redisClient.set(`image:${textHex}`, result.url);

    return {
      cardId: payload.cardId,
      image: result.url,
    };
  },
  onSuccess: async (payload: TextToImagePayload, output) => {
    await db
      .update(cardTable)
      .set({ image: output.image })
      .where(eq(cardTable.id, payload.cardId));
  },
  onFailure: async (payload: TextToImagePayload, _error, { ctx: { run } }) => {
    await db
      .update(cardTable)
      .set({ image: PLACEHOLDER_URL })
      .where(eq(cardTable.id, payload.cardId));

    let runsIds: string[] =
      (await redisClient.get(`runs:${payload.cardId}`)) ?? [];

    runsIds = runsIds.filter((runId) => {
      return runId !== run.id;
    });

    await redisClient.set(`runs:${payload.cardId}`, runsIds, {
      ex: 120,
    });
  },
});

export const toMatchableHex = (input: string) => {
  return Buffer.from(
    input.toLocaleLowerCase().trim().replace(/\s+/g, " "),
  ).toString("hex");
};

export const textToImage = async (
  text: string,
  model = "dall-e-3",
  n = 1,
  response_format: "url" | "b64_json" = "b64_json",
  quality = "standard",
  size = "1024x1024",
  style = "vivid",
  user?: string,
) => {
  let prompt: string;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a designer working on a flashcard app.
              You have professional knowledge in AI prompting and design.`,
          },
          {
            role: "user",
            content: `Create a prompt for text-to-image generation
              to create a cover image for a flashcard. The card will hold a word or phrase: "${text}"
              and the image should help users memorize it. But the image should not contain any text or letters.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generating image: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    prompt = (await response.json()).choices[0].message.content;
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw error;
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model,
          n,
          quality,
          response_format,
          size,
          style,
          user,
        }),
      },
    );

    return response;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};
