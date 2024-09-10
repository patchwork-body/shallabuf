export const textToSpeech = async (
  text: string,
  model = "tts-1",
  voice = "alloy",
  response_format = "mp3",
  speed = 1.0,
): Promise<ReadableStream<Uint8Array>> => {
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

    return response.body as ReadableStream<Uint8Array>;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};
