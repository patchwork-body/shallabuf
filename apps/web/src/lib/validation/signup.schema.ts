import { z } from "zod";

export const signupSchema = z
  .object({
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
    confirmPassword: z.string().refine((value) => value !== "", {
      message: "Confirm Password is required",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });
