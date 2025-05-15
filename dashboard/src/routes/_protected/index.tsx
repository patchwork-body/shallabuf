import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getWebRequest } from "@tanstack/react-start/server";
import { getSessionToken } from "~/lib/session";
import { trpc } from "~/trpc/client";

export const Route = createFileRoute("/_protected/")({
  beforeLoad: async ({ context }) => {
    const request = getWebRequest();

    if (!request) {
      throw redirect({ to: "/login", replace: true });
    }

    const sessionToken = getSessionToken(request);

    if (!sessionToken) {
      throw redirect({ to: "/login", replace: true });
    }

    const { session } = await context.queryClient.fetchQuery(trpc.auth.validateSession.queryOptions({ token: sessionToken }));

    if (!session) {
      throw redirect({ to: "/login", replace: true });
    }

    return { session };
  },
  onError: ({ error }) => {
    if (error.message === "UNAUTHORIZED") {
      throw redirect({ to: "/login", replace: true });
    }

    throw error;
  },

  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main>
      <Outlet />
    </main>
  );
}
