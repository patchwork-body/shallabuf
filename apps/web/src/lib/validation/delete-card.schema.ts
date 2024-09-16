import { z } from "zod";

export const deleteCardSchema = z.object({
  cardId: z.string(),
});
