import { useState } from "react";
import { Button } from "./ui/button";
import { CreateAppDialog } from "./CreateAppDialog";
import {
  useInfiniteQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { AppInfo } from "~/lib/schemas";
import { AppCard } from "./AppCard";

export function AppList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      ...trpc.apps.list.infiniteQueryOptions({
        cursor: undefined,
        limit: 10,
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const queryClient = useQueryClient();
  const deleteAppMutation = useMutation({
    ...trpc.apps.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        trpc.apps.list.infiniteQueryOptions({ cursor: undefined, limit: 10 })
      );
    },
  });

  if (!data) return null;

  // Flatten all apps from all pages
  const apps: AppInfo[] = data.pages.flatMap((page) => page.apps);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="w-[200px]">
          {apps.length > 0 ? <CreateAppDialog /> : null}
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-8 dark:border-gray-700 dark:bg-gray-800/50">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">No apps yet</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first app</p>
          <CreateAppDialog />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard
              key={app.appId}
              app={app}
              isDeleting={
                deleteAppMutation.isPending &&
                deleteAppMutation.variables?.appId === app.appId
              }
              onDelete={() => deleteAppMutation.mutateAsync({ appId: app.appId })}
            />
          ))}
        </div>
      )}

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
