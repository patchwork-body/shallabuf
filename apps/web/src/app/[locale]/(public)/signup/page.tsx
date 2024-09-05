import { Button } from "@shallabuf/ui/button";
import { Input } from "@shallabuf/ui/input";
import { Label } from "@shallabuf/ui/label";
import { signup } from "actions/auth/signup";
import { useAction } from "next-safe-action/hooks";

export const metadata = {
  title: "Sign Up",
};

export default function Page() {
  const { execute, isPending } = useAction(signup);

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
          autoComplete="new-password"
        />

        <Label htmlFor="email">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
          autoComplete="new-password"
        />

        <Button disabled={isPending} type="submit">
          Sign Up
        </Button>
      </form>
    </div>
  );
}
