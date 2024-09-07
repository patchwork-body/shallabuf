import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .max(256)
    .refine((value) => value !== "", {
      message: "Email is required",
    })
    .pipe(z.string().email()),
  password: z.string().refine((value) => value !== "", {
    message: "Password is required",
  }),
});
