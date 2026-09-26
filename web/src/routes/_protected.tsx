import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ context, location }) => {
    if (!context.session || !context.session.id) {
      const redirectTo = location.pathname + location.search;

      throw redirect({
        to: "/login",
        search: {
          redirect: redirectTo,
        },
      });
    }
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  return <Outlet />;
}
