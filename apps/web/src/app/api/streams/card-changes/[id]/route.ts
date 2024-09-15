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

  const runsIds: string[] | null =
    (await redisClient.get(`runs:${params.id}`)) ?? [];

  const stream = new ReadableStream({
    async start(controller) {
      let counter = 0;

      while ((runsIds?.length ?? 0) > 0 && counter < 10) {
        const results = await Promise.all(
          runsIds?.map((runId) => {
            return runs.retrieve(runId);
          }) ?? [],
        );

        const completed = results.filter((run) => run.status === "COMPLETED");

        for (const run of completed) {
          runsIds.splice(runsIds.indexOf(run.id), 1);
        }

        const output = completed.map((run) => run.output);
        counter++;

        controller.enqueue(encoder.encode(JSON.stringify(output)));
        await delay(1000);
      }

      if (runsIds.length > 0) {
        await redisClient.set(`runs:${params.id}`, JSON.stringify(runsIds), {
          ex: 120,
        });
      }

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
