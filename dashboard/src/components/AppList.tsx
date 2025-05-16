import { Button } from "./ui/button";
import { CreateAppDialog } from "./CreateAppDialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { AppInfo } from "~/lib/schemas";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";

export function AppList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      ...trpc.apps.list.infiniteQueryOptions({
        cursor: undefined,
        limit: 10,
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="w-[200px]">
          <CreateAppDialog />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.pages.map((page) =>
          page.apps.map((app: AppInfo) => (
            <Card
              key={app.appId}
              className="hover:bg-gray-50 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10 group-hover:opacity-100 transition-opacity rounded-xl dark:hover:bg-gray-800 hover:shadow-lg dark:hover:shadow-lg/10 hover:scale-[1.02] group"
            >
              <CardHeader>
                <CardTitle className="text-2xl font-bold dark:text-white">{app.name}</CardTitle>
                <CardDescription className="text-muted-foreground dark:text-white/80">
                  {app.description || "No description"}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            className="min-w-[140px] transition-all duration-200 hover:shadow-md dark:hover:shadow-md/10"
          >
            {isFetchingNextPage ? "Loading more..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
