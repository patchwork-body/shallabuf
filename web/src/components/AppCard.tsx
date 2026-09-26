import { useState } from "react";
import { AppInfo } from "~/lib/schemas";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { EditAppDialog } from "./EditAppDialog";
import { RemoveAppDialog } from "./RemoveAppDialog";
import { cn } from "~/lib/utils";

interface AppCardProps {
  app: AppInfo;
  onDelete: () => void;
  isDeleting: boolean;
}

export function AppCard({ app, onDelete, isDeleting }: AppCardProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(app.appId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <Card key={app.appId} className="flex-row justify-between p-6">
      <CardHeader className="flex-1">
        <div className="flex items-center gap-2 truncate">
          <CardTitle className="truncate">{app.name}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex items-center gap-1.5 px-2 transition-all",
                    copied && "text-green-500 border-green-500"
                  )}
                  onClick={onCopy}
                >
                  <span className="text-xs sr-only font-mono">{app.appId}</span>
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to copy App ID</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-muted-foreground dark:text-white/80 truncate">
          {app.description || "No description"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-2">
        <EditAppDialog app={app} />
        <RemoveAppDialog app={app} onDelete={onDelete} isDeleting={isDeleting} />
      </CardContent>
    </Card>
  );
}
