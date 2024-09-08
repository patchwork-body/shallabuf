import { logger, task } from "@trigger.dev/sdk/v3";
import { scrapeCardsFromQuizlet } from "../functions";

export type ImportFromQuizletPayload = {
  url: URL;
};

export const importFromQuizlet = task({
  id: "import-from-quizlet",
  run: async (payload: ImportFromQuizletPayload, { ctx }) => {
    logger.log("Starting to scrape cards from Quizlet", {
      url: payload.url,
      ctx,
    });
    return await scrapeCardsFromQuizlet(payload.url);
  },
  onSuccess: async (payload, output, { ctx }) => {
    logger.log("Successfully scraped cards from Quizlet", {
      url: payload.url,
      output,
      ctx,
    });
  },
});
