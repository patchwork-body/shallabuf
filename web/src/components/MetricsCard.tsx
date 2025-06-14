import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
  };
  loading?: boolean;
  className?: string;
  valueFormatter?: (value: number | string) => string;
}

export function MetricsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading,
  className,
  valueFormatter,
}: MetricsCardProps) {
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          {Icon && <Skeleton className="h-4 w-4" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  const displayValue = valueFormatter 
    ? valueFormatter(value) 
    : typeof value === "number" 
      ? value.toLocaleString() 
      : value;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {description && <span>{description}</span>}
          {trend && (
            <Badge
              variant={
                trend.type === "increase"
                  ? "default"
                  : trend.type === "decrease"
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {trend.type === "increase" ? "+" : trend.type === "decrease" ? "-" : ""}
              {Math.abs(trend.value)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function for formatting various metric values
export const formatters = {
  bytes: (value: number | string) => {
    const bytes = typeof value === "string" ? parseInt(value) : value;
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  },
  duration: (value: number | string) => {
    const ms = typeof value === "string" ? parseInt(value) : value;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  },
  currency: (value: number | string) => {
    const amount = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  },
  number: (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString();
  },
}; 