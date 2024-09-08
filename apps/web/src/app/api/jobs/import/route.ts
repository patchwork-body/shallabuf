import type { importFromQuizlet } from "@shallabuf/jobs/trigger/import-from-quizlet";
import { tasks } from "@trigger.dev/sdk/v3";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestBodySchema = z.object({
  provider: z.string(),
  url: z.string().url(),
});

export async function GET(request: Request) {
  const { data, error } = requestBodySchema.safeParse(await request.json());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.provider === "quizlet") {
    const handle = await tasks.trigger<typeof importFromQuizlet>(
      "import-from-quizlet",
      {
        url: new URL(data.url),
      },
    );

    return NextResponse.json(handle);
  }

  return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
}
