import { z } from "zod";

export const createDeckSchema = z.object({
  name: z
    .string()
    .max(256)
    .refine((value) => value !== "", {
      message: "Name is required",
    }),
});
