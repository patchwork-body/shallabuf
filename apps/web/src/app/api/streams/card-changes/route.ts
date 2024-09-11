import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const cardChangesStreamBodySchema = z.object({
  cardId: z.string(),
});

export async function POST(request: Request) {
  const { data, error } = cardChangesStreamBodySchema.safeParse(
    await request.json(),
  );

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  const selectResult = await db
    .select()
    .from(cardTable)
    .where(eq(cardTable.id, data.cardId));

  const card = selectResult[0];

  if (!card) {
    return NextResponse.json({ card: null });
  }

  const stream = new ReadableStream({
    start(controller) {
      let count = 0;

      const intervalId = setInterval(() => {
        controller.enqueue(JSON.stringify(card));
        count++;

        if (count >= 5) {
          clearInterval(intervalId);
          controller.close();
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Transfer-Encoding": "chunked",
      Connection: "keep-alive",
    },
  });
}
