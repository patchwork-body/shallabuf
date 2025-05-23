import { useQuery } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertCircle, RefreshCw, Folder, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { memo } from "react";

export interface OrgsAppsMiniListProps {
  organizationId: string;
  maxItems?: number;
  className?: string;
}

const AppItem = memo(
  ({
    app,
  }: {
    app: { appId: string; name: string; description?: string | null };
  }) => (
    <li className="group cursor-default" role="listitem">
      <div className="flex items-start space-x-2 p-2 rounded-md transition-colors duration-150 hover:bg-accent/30">
        <FileText
          className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-xs truncate" title={app.name}>
            {app.name}
          </h4>
          {app.description && (
            <p
              className="text-xs text-muted-foreground truncate mt-0.5"
              title={app.description}
            >
              {app.description}
            </p>
          )}
        </div>
      </div>
    </li>
  )
);

AppItem.displayName = "AppItem";

const AppsListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center space-x-2 p-2">
        <Skeleton className="h-3 w-3 rounded" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const AppsListError = ({
  onRetry,
  error,
}: {
  onRetry: () => void;
  error: string;
}) => (
  <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
    <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
    <p className="text-xs text-muted-foreground">Failed to load apps</p>
    <Button
      variant="ghost"
      size="sm"
      onClick={onRetry}
      className="h-6 px-2 text-xs"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      Retry
    </Button>
  </div>
);

const EmptyAppsState = () => (
  <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
    <Folder className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
    <p className="text-xs text-muted-foreground">
      No apps in this organization
    </p>
  </div>
);

export const OrgsAppsMiniList = memo(
  ({ organizationId, maxItems = 5, className }: OrgsAppsMiniListProps) => {
    const appsQuery = useQuery({
      ...trpc.apps.list.queryOptions({
        organizationId,
        limit: maxItems,
      }),
      staleTime: 30000, // 30 seconds
      enabled: !!organizationId,
    });

    const { data, isLoading, isError, error, refetch } = appsQuery;

    if (isLoading) {
      return (
        <div className={cn("space-y-3", className)}>
          <div className="pb-2 border-b">
            <h3 className="text-sm font-medium text-foreground">Recent Apps</h3>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
          <AppsListSkeleton count={Math.min(maxItems, 3)} />
        </div>
      );
    }

    if (isError) {
      return (
        <div className={cn("space-y-3", className)}>
          <div className="pb-2 border-b">
            <h3 className="text-sm font-medium text-foreground">Recent Apps</h3>
            <p className="text-xs text-muted-foreground">Error occurred</p>
          </div>
          <AppsListError
            onRetry={() => refetch()}
            error={error?.message || "Unknown error"}
          />
        </div>
      );
    }

    const { apps = [] } = data ?? {};
    const displayApps = apps.slice(0, maxItems);

    if (displayApps.length === 0) {
      return (
        <div className={cn("space-y-3", className)}>
          <div className="pb-2 border-b">
            <h3 className="text-sm font-medium text-foreground">Recent Apps</h3>
            <p className="text-xs text-muted-foreground">No apps found</p>
          </div>
          <EmptyAppsState />
        </div>
      );
    }

    return (
      <div className={cn("space-y-3", className)}>
        <div className="pb-2 border-b">
          <h3 className="text-sm font-medium text-foreground">Recent Apps</h3>
          <p className="text-xs text-muted-foreground">
            {apps.length === 1
              ? "1 app"
              : `${Math.min(apps.length, maxItems)} of ${apps.length} apps`}
          </p>
        </div>
        <ul
          className="space-y-1"
          role="list"
          aria-label={`Recent apps in organization`}
        >
          {displayApps.map((app) => (
            <AppItem key={app.appId} app={app} />
          ))}
        </ul>
        {apps.length > maxItems && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              +{apps.length - maxItems} more apps
            </p>
          </div>
        )}
      </div>
    );
  }
);

OrgsAppsMiniList.displayName = "OrgsAppsMiniList";
