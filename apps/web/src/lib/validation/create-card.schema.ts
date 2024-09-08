import { z } from "zod";

export const createCardSchema = z.object({
  front: z
    .string()
    .max(256)
    .refine((value) => value !== "", {
      message: "Front is required",
    }),
  back: z
    .string()
    .max(256)
    .refine((value) => value !== "", {
      message: "Back is required",
    }),
  deckId: z.string(),
});
