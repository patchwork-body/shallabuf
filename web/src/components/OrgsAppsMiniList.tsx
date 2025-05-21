import { useQuery } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { Skeleton } from "~/components/ui/skeleton";

export interface OrgsAppsMiniListProps {
  orgId: string;
}

export const OrgsAppsMiniList = ({ orgId }: OrgsAppsMiniListProps) => {
  const appsQuery = useQuery({
    ...trpc.apps.list.queryOptions({
      limit: 5,
    }),
    staleTime: 0,
  });

  if (appsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Apps</h3>
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <li
              key={index}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-2 w-full">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (appsQuery.isError) {
    return <div>Error loading apps: {appsQuery.error.message}</div>;
  }

  const { apps } = appsQuery.data ?? { apps: [] };

  if (apps.length === 0) {
    return <div>No apps found</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Apps</h3>
      <ul className="space-y-2">
        {apps.slice(0, 5).map((app) => (
          <li
            key={app.appId}
            className="flex items-center justify-between"
          >
            <div>
              <h4 className="font-medium text-sm truncate">{app.name}</h4>
              {app.description && (
                <p className="text-sm text-gray-600 truncate">{app.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};