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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/query-client";
import { ReactNode } from "react";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  theme?: "light" | "dark";
}>()({
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
    ],
  }),
  // SSR: read theme from cookie and pass as context
  loader: async ({ context }) => {
    return { theme: context.theme };
  },
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
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = getQueryClient();
  return (
    <html lang="en" data-theme='dark'>
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm px-6 py-4 flex items-center justify-between backdrop-blur">
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Shallabuf
          </span>
        </header>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </QueryClientProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
