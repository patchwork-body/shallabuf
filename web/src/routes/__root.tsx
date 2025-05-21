import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import appCss from "~/styles/app.css?url";
import { seo } from "~/utils/seo";
import { ReactNode } from "react";
import { trpc } from "~/trpc/client";
import { QueryClient } from "@tanstack/react-query";
import { Header } from "~/components/Header";
import { Session } from "~/lib/schemas";
import { SessionProvider } from "~/contexts/session";

export const Route = createRootRouteWithContext<{
  trpc: typeof trpc;
  queryClient: QueryClient;
  theme?: "light" | "dark";
}>()({
  beforeLoad: async ({ context }) => {
    let session: Session | null = null;

    try {
      session = await context.queryClient.fetchQuery(
        trpc.auth.validateSession.queryOptions()
      );
    } catch (error) {
      // If error is 5xx server error, throw it
      if (
        error instanceof Error &&
        "status" in error &&
        (error as any).status >= 500
      ) {
        throw error;
      }
    }

    return { session };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title:
          "TanStack Start | Type-Safe, Client-First, Full-Stack React Framework",
        description: `TanStack Start is a type-safe, client-first, full-stack React framework. `,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500",
      },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  const { session } = Route.useRouteContext();

  return (
    <SessionProvider session={session}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </SessionProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <main className="min-h-dvh grid grid-rows-[auto_1fr] bg-background">
          <Header />
          {children}
        </main>
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
