import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const cardChangesStreamQuerySchema = z.object({
  cardId: z.string(),
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const { data, error } = cardChangesStreamQuerySchema.safeParse(queryParams);

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(card)));
      await delay(500);
      controller.enqueue(encoder.encode(JSON.stringify(card)));
      await delay(500);
      controller.enqueue(encoder.encode(JSON.stringify(card)));
      await delay(500);
      controller.enqueue(encoder.encode(JSON.stringify(card)));
      await delay(500);
      // controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
