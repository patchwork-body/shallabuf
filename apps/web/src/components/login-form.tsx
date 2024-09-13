"use client";

import { login } from "@/actions/auth/login";
import { loginSchema } from "@/lib/validation";
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

export const LoginForm = () => {
  const { form, handleSubmitWithAction } = useHookFormAction(
    login,
    zodResolver(loginSchema),
    {
      formProps: {
        mode: "onSubmit",
        defaultValues: {
          email: "",
          password: "",
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
          noValidate
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
                    autoFocus={true}
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
                    placeholder="Enter your password"
                    aria-required="true"
                    autoFocus={true}
                    autoComplete="current-password"
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
            Login
            {form.formState.isSubmitting && (
              <span className="animate-spin">
                <Loader />
              </span>
            )}
          </Button>

          <Link href="/signup">Don't have an account? Sign up here</Link>
        </form>
      </Form>
    </div>
  );
};
