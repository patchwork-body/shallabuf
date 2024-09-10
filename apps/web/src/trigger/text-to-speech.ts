import { cardTable } from "@/db/schema";
import { db } from "@shallabuf/turso";
import { task } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";

export type TextToSpeechPayload = {
  // String that consists of the cardId and front/back card side delimited by a colon
  // e.g. "1234:front"
  // Exists to identify the text with the audio later in the webhook
  fingerprint: string;
  text: string;
};

export const textToSpeechTask = task({
  id: "text-to-speech",
  run: async (payload: TextToSpeechPayload) => {
    const stream = await textToSpeech(payload.text);
    const buffer = await streamToBuffer(stream);

    const result = await put(
      `${Buffer.from(payload.text, "utf8").toString("hex")}.mp3`,
      buffer,
      { access: "public" },
    );

    const [cardId, side] = payload.fingerprint.split(":");

    if (!cardId || !side) {
      throw new Error("Invalid fingerprint");
    }

    if (side !== "front" && side !== "back") {
      throw new Error("Invalid side");
    }

    if (side === "front") {
      await db
        .update(cardTable)
        .set({ frontAudio: result.downloadUrl })
        .where(eq(cardTable.id, cardId));
    }

    if (side === "back") {
      await db
        .update(cardTable)
        .set({ backAudio: result.downloadUrl })
        .where(eq(cardTable.id, cardId));
    }
  },
});

export const textToSpeech = async (
  text: string,
  model = "tts-1",
  voice = "alloy",
  response_format = "mp3",
  speed = 1.0,
) => {
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format,
        speed,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generating speech: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    return response.body;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

const streamToBuffer = async (
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) {
      chunks.push(value);
    }
    done = readerDone;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = Buffer.concat(chunks, totalLength);

  return buffer;
};
