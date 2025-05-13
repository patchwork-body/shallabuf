import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/login/")({
  component: Login,
});

// Mock async login function
async function mockLogin({ email, password }: { email: string; password: string }) {
  await new Promise((r) => setTimeout(r, 500));
  if (email === "test@example.com" && password === "password") {
    return { success: true };
  }
  throw new Error("Invalid email or password");
}

function Login() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: mockLogin,
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync(value);
        navigate({ to: "/" as any });
      } catch (err) {
        // error handled by mutation.error
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-pink-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">Login</h1>
        <form onSubmit={form.handleSubmit} className="space-y-6">
          <form.Field name="email">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                <Input
                  id={field.name}
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                  disabled={mutation.isPending}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
                />
                {!field.state.meta.isValid && (
                  <div className="text-xs text-red-500 mt-1 dark:text-red-400">{field.state.meta.errors.join(", ")}</div>
                )}
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
                <Input
                  id={field.name}
                  type="password"
                  autoComplete="current-password"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                  disabled={mutation.isPending}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
                />
                {!field.state.meta.isValid && (
                  <div className="text-xs text-red-500 mt-1 dark:text-red-400">{field.state.meta.errors.join(", ")}</div>
                )}
              </div>
            )}
          </form.Field>
          {mutation.error && (
            <div className="text-sm text-red-600 text-center dark:text-red-400">{(mutation.error as Error).message}</div>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-blue-400"
          >
            {mutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
