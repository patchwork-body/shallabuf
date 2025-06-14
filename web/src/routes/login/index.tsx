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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { SocialLoginButtons } from "~/components/SocialLoginButtons";
import { useServerFn } from "@tanstack/react-start";
import { loginFn, signupFn } from "~/server-functions/auth";

export const Route = createFileRoute("/login/")({
  component: Login,
});

function Login() {
  const router = useRouter();
  const login = useServerFn(loginFn);
  const signup = useServerFn(signupFn);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: "/orgs" });
    },
  });

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: "/orgs" });
    },
  });

  const loginForm = useForm({
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

  const signupForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await signupMutation.mutateAsync({
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

  const handleLoginSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      loginForm.handleSubmit();
    },
    [loginForm]
  );

  const handleSignupSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      signupForm.handleSubmit();
    },
    [signupForm]
  );

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-6">
          <div className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                onSubmit={handleLoginSubmit}
                className="flex flex-col gap-4 min-w-full"
              >
                <loginForm.Field name="email">
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
                </loginForm.Field>
                <loginForm.Field name="password">
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
                </loginForm.Field>
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
                  {loginForm.state.isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                onSubmit={handleSignupSubmit}
                className="flex flex-col gap-4 min-w-full"
              >
                <signupForm.Field name="email">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`signup-${field.name}`}>Email</Label>
                      <Input
                        id={`signup-${field.name}`}
                        type="email"
                        autoComplete="email"
                        placeholder="your@email.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                        disabled={signupMutation.isPending}
                      />
                      {!field.state.meta.isValid && (
                        <div className="text-xs text-red-500 mt-1 dark:text-red-400">
                          {field.state.meta.errors.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </signupForm.Field>
                <signupForm.Field name="password">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`signup-${field.name}`}>Password</Label>
                      <Input
                        id={`signup-${field.name}`}
                        type="password"
                        autoComplete="new-password"
                        placeholder="Minimum 8 characters"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                        disabled={signupMutation.isPending}
                      />
                      {!field.state.meta.isValid && (
                        <div className="text-xs text-red-500 mt-1 dark:text-red-400">
                          {field.state.meta.errors.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </signupForm.Field>
                {signupMutation.error && (
                  <div className="text-sm text-red-600 text-center dark:text-red-400">
                    {signupMutation.error.message}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={signupMutation.isPending}
                  className="w-full"
                >
                  {signupForm.state.isSubmitting
                    ? "Creating account..."
                    : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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
