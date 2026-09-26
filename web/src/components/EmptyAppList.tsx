import { Package, Plus, Sparkles } from "lucide-react";
import { CreateAppDialog } from "./CreateAppDialog";
import { AppCredentials } from "./AppCredentialsDialog";
import { Card, CardContent } from "./ui/card";

interface EmptyAppListProps {
  onCreateAppSuccess: (credentials: AppCredentials) => void;
}

export function EmptyAppList({ onCreateAppSuccess }: EmptyAppListProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-900/30 shadow-none w-full">
        <CardContent className="flex flex-col items-center justify-center px-8 py-12 text-center space-y-6">
          {/* Icon with gradient background */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl rounded-full"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-full">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                No applications yet
              </h3>
              <Sparkles className="size-5 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">
              Create your first application to start building amazing things.
              Each app gives you dedicated API credentials and management tools.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <CreateAppDialog onSuccess={onCreateAppSuccess} />
          </div>

          {/* Decorative elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute bottom-6 left-6 opacity-20">
            <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse delay-1000"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
