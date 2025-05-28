import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { FormEventHandler, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "~/components/ui/card";
import { SocialLoginButtons } from "~/components/SocialLoginButtons";
import { useServerFn } from "@tanstack/react-start";
import { loginFn } from "~/server-functions/auth";

export const Route = createFileRoute("/login/")({
  component: Login,
});

function Login() {
  const router = useRouter();
  const login = useServerFn(loginFn);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: "/orgs" });
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await loginMutation.mutateAsync({
          data: {
            email: value.email,
            password: value.password,
          },
        });
      } catch (err) {
        console.error(err);
      }
    },
  });

  const submit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardTitle>Login</CardTitle>
        <CardDescription>Login to your account to continue</CardDescription>

        <CardContent className="flex flex-col gap-6">
          <form onSubmit={submit} className="flex flex-col gap-6 min-w-full">
            <form.Field name="email">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                    disabled={loginMutation.isPending}
                  />
                  {!field.state.meta.isValid && (
                    <div className="text-xs text-red-500 mt-1 dark:text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Password</Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    placeholder="********"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                    disabled={loginMutation.isPending}
                  />
                  {!field.state.meta.isValid && (
                    <div className="text-xs text-red-500 mt-1 dark:text-red-400">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>
            {loginMutation.error && (
              <div className="text-sm text-red-600 text-center dark:text-red-400">
                {loginMutation.error.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {form.state.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>

            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <SocialLoginButtons />
        </CardContent>
      </Card>
    </div>
  );
}
