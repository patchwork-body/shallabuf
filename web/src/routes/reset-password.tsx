import {
  createFileRoute,
  Link,
  redirect,
  useSearch,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "~/components/ui/card";
import { FormEventHandler, useCallback, useState } from "react";
import { ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import * as v from "valibot";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { env } from "~/env";
import { setHeader } from "@tanstack/react-start/server";

const newPasswordSchema = v.pipe(
  v.string("Password must be a string"),
  v.minLength(8, "Password must be at least 8 characters long"),
  v.regex(/[a-z]/, "Password must contain at least one lowercase letter"),
  v.regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  v.regex(/[0-9]/, "Password must contain at least one number")
);

const confirmPasswordSchema = v.string("Please confirm your password");

const resetPasswordFormSchema = v.pipe(
  v.object({
    newPassword: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  }),
  v.forward(
    v.partialCheck(
      [["newPassword"], ["confirmPassword"]],
      (input) => input.newPassword === input.confirmPassword,
      "Passwords do not match"
    ),
    ["confirmPassword"]
  )
);

const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(
    v.object({
      token: v.string(),
      newPassword: newPasswordSchema,
    })
  )
  .handler(async ({ data }) => {
    console.log({ data });
    const response = await fetch(`${env.API_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const responseData = await response.json();

    setHeader(
      "Set-Cookie",
      `session=${responseData.token}; HttpOnly; Path=/; SameSite=${
        process.env.NODE_ENV === "production" ? "Strict" : "Lax"
      }; Secure=${process.env.NODE_ENV === "production"}; Expires=${new Date(
        responseData.expiresAt
      ).toUTCString()}`
    );

    throw redirect({ to: "/orgs" });
  });

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = useSearch({ from: "/reset-password" });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resetPassword = useServerFn(resetPasswordFn);

  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!search.token) {
        return;
      }

      try {
        await resetPassword({
          data: {
            token: search.token,
            newPassword: value.newPassword,
          },
        });
        setIsSubmitted(true);
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

  // If no token provided, show error
  if (!search.token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold text-destructive">
                Invalid Link
              </h1>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired.
              </p>
            </div>

            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after password reset
  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/20">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold">
                Password Set Successfully!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your password has been set. You can now log in to your account.
              </p>
            </div>

            <Link to="/login" className="w-full">
              <Button className="w-full">Continue to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardTitle>Set Your Password</CardTitle>

        <CardDescription>
          Welcome! Please set a secure password for your new account.
        </CardDescription>

        <CardContent className="flex flex-col gap-6">
          <form onSubmit={submit} className="flex flex-col gap-6 min-w-full">
            <form.Field
              name="newPassword"
              validators={{
                onChange: newPasswordSchema,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>New Password</Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter your new password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      disabled={form.state.isSubmitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <div className="text-xs text-destructive">
                        {field.state.meta.errors.map((error, i) => (
                          <div key={i}>
                            {typeof error === "string"
                              ? error
                              : error?.message || "Invalid value"}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onChange: confirmPasswordSchema,
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirm your new password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      disabled={form.state.isSubmitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <div className="text-xs text-destructive">
                        {field.state.meta.errors.map((error, i) => (
                          <div key={i}>
                            {typeof error === "string"
                              ? error
                              : error?.message || "Invalid value"}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </form.Field>

            {/* Password requirements */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Password requirements:</p>
              <ul className="space-y-1 ml-4">
                <li>• At least 8 characters long</li>
                <li>• Contains at least one uppercase letter</li>
                <li>• Contains at least one lowercase letter</li>
                <li>• Contains at least one number</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={form.state.isSubmitting}
              className="w-full"
            >
              {form.state.isSubmitting ? "Setting Password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
