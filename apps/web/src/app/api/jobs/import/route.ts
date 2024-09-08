import { scrapeCardsFromQuizlet } from "@shallabuf/jobs/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const importRouteBodyValidationSchema = z.object({
  provider: z.string(),
  url: z.string(),
});

export async function POST(request: Request) {
  const { data, error } = importRouteBodyValidationSchema.safeParse(
    await request.json(),
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.provider === "quizlet") {
    const handle = await scrapeCardsFromQuizlet(new URL(data.url));

    return NextResponse.json(handle);
  }

  return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
}
