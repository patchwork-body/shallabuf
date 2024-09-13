import { client as redisClient } from "@shallabuf/kv/client";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { cardTable } from "@shallabuf/turso/schema";
import { runs } from "@trigger.dev/sdk/v3";
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
      let runsIds: string[] | null = [];

      do {
        runsIds = await redisClient.get(`runs:${data.cardId}`);

        if (!runsIds) {
          break;
        }

        const results = await Promise.all(
          runsIds.map((runId) => {
            return runs.retrieve(runId);
          }),
        );

        const successfulRuns = [];
        const unsuccessfulRunsIds = [];

        for (const run of results) {
          if (run.isSuccess) {
            successfulRuns.push(run);
          } else {
            unsuccessfulRunsIds.push(run.id);
          }
        }

        await redisClient.set(
          `runs:${data.cardId}`,
          JSON.stringify(unsuccessfulRunsIds),
          { ex: 120 },
        );

        for (const run of successfulRuns) {
          controller.enqueue(encoder.encode(JSON.stringify(run.output)));
        }

        await delay(1000);
      } while (runsIds.length > 0);

      controller.close();
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
