import { textToImage } from "@/helpers/text-to-image";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  const readable = new ReadableStream({
    async start(controller) {
      const response = await textToImage(body.text);

      if (!response.ok) {
        throw new Error(`Error generating image: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        controller.enqueue(value);
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache; no-transform",
      "Content-Encoding": "none",
      Connection: "keep-alive",
    },
  });
}
