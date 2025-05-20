import { Button } from "./ui/button";
import { trpc } from "~/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Route } from "~/routes/__root";

export const Header = () => {
  const { session } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    ...trpc.auth.logout.mutationOptions(),
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: "/login" });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <header className="sticky top-0 z-30 w-full border-b shadow-sm px-6 py-4 flex items-center justify-between backdrop-blur">
      <span className="flex items-center gap-2">
        <Logo className="size-6" />
        Shallabuf
      </span>
      {session && (
        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      )}
    </header>
  );
};
