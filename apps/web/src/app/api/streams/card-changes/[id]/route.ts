import { client as redisClient } from "@shallabuf/kv/client";
import { runs } from "@trigger.dev/sdk/v3";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let runsIds: string[] | null = [];
      let counter = 0;

      do {
        runsIds = await redisClient.get(`runs:${params.id}`);

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
          `runs:${params.id}`,
          JSON.stringify(unsuccessfulRunsIds),
          { ex: 120 },
        );

        for (const run of successfulRuns) {
          controller.enqueue(encoder.encode(JSON.stringify(run.output)));
        }

        counter++;
        await delay(1000);
      } while (runsIds.length > 0 && counter < 10);

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
