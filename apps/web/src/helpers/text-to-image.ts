export const textToImage = async (
  text: string,
  model = "dall-e-3",
  n = 1,
  response_format: "url" | "b64_json" = "b64_json",
  quality = "standard",
  size = "512x512",
  style = "vivid",
  user?: string,
) => {
  let prompt: string;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a designer working on a flashcard app.
              You have professional knowledge in AI prompting and design.`,
          },
          {
            role: "user",
            content: `Create a prompt for text-to-image generation
              to create a cover image for a flashcard. The card will hold a word or phrase: "${text}"
              and the image should help users memorize it. But the image should not contain any text or letters.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generating image: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    prompt = (await response.json()).choices[0].message.content;
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw error;
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model,
          n,
          quality,
          response_format,
          size,
          style,
          user,
        }),
      },
    );

    return response;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};
