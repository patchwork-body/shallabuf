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
import { AppCredentials, AppCredentialsDialog } from "./AppCredentialsDialog";
import { useCallback, useState } from "react";
import { BlocksIcon } from "lucide-react";
import { EmptyAppList } from "./EmptyAppList";

export interface AppListProps {
  organizationId: string;
}

export function AppList({ organizationId }: AppListProps) {
  const [credentials, setCredentials] = useState<AppCredentials | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      ...trpc.apps.list.infiniteQueryOptions({
        organizationId,
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
        trpc.apps.list.infiniteQueryOptions({
          organizationId,
          cursor: undefined,
          limit: 10,
        })
      );
    },
  });

  const handleCreateAppSuccess = useCallback((credentials: AppCredentials) => {
    setCredentials(credentials);
  }, []);

  if (!data) return null;

  // Flatten all apps from all pages
  const apps: AppInfo[] = data.pages.flatMap((page) => page.apps);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex flex-col min-w-full mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <BlocksIcon className="size-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>

          <div className="ml-auto">
            {apps.length > 0 && (
              <CreateAppDialog onSuccess={handleCreateAppSuccess} />
            )}
          </div>
        </div>

        <p className="text-muted-foreground">
          Manage your application building blocks and API credentials.
        </p>
      </div>

      <AppCredentialsDialog
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />

      {apps.length === 0 ? (
        <EmptyAppList onCreateAppSuccess={handleCreateAppSuccess} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <li key={app.appId}>
              <AppCard
                key={app.appId}
                app={app}
                isDeleting={
                  deleteAppMutation.isPending &&
                  deleteAppMutation.variables?.appId === app.appId
                }
                onDelete={() =>
                  deleteAppMutation.mutateAsync({ appId: app.appId })
                }
              />
            </li>
          ))}
        </ul>
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
