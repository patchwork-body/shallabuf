"use client";

import { login } from "@/actions/auth/login";
import { Button } from "@shallabuf/ui/button";
import { Input } from "@shallabuf/ui/input";
import { Label } from "@shallabuf/ui/label";
import { useAction } from "next-safe-action/hooks";

export const LoginForm = () => {
  const { execute, isPending } = useAction(login);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <form className="flex flex-col space-y-4" action={execute}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          required
          autoFocus={true}
          autoComplete="email"
        />

        <Label htmlFor="email">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />

        <Button disabled={isPending} type="submit">
          Login
        </Button>
      </form>
    </div>
  );
};
