"use client";

import { signup } from "@/actions/auth/signup";
import { signupSchema } from "@/lib/validation/signup.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { Button } from "@shallabuf/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRootMessage,
} from "@shallabuf/ui/form";
import { Input } from "@shallabuf/ui/input";
import { Loader } from "lucide-react";
import Link from "next/link";

export const SignUpForm = () => {
  const { form, handleSubmitWithAction } = useHookFormAction(
    signup,
    zodResolver(signupSchema),
    {
      formProps: {
        mode: "onSubmit",
        defaultValues: {
          email: "",
          password: "",
          confirmPassword: "",
        },
        reValidateMode: "onSubmit",
      },
    },
  );

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <Form {...form}>
        <form
          className="flex flex-col space-y-4 min-w-80"
          onSubmit={handleSubmitWithAction}
        >
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>

                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    aria-required="true"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>

                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>

                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    aria-required="true"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>

                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="confirmPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>

                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    aria-required="true"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>

                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormRootMessage />

          <Button
            className="flex gap-x-4"
            aria-busy={form.formState.isLoading}
            aria-disabled={form.formState.isLoading}
            type="submit"
          >
            Sign Up
            {form.formState.isLoading && (
              <span className="animate-spin">
                <Loader />
              </span>
            )}
          </Button>

          <Link href="/login">Already have an account? Login here</Link>
        </form>
      </Form>
    </div>
  );
};
