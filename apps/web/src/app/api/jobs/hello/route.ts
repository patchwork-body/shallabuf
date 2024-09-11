// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { helloWorldTask } from "@shallabuf/jobs/trigger/example";
import { tasks } from "@trigger.dev/sdk/v3";
import { NextResponse } from "next/server";

//tasks.trigger also works with the edge runtime
// export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const handle = await tasks.trigger<typeof helloWorldTask>(
    "hello-world",
    "James",
  );

  return NextResponse.json(handle);
}
