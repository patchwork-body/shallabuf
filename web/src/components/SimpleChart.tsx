import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./ui/chart";
import { cn } from "~/lib/utils";

export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp?: string;
}

interface SimpleChartProps {
  title: string;
  data: ChartDataPoint[];
  loading?: boolean;
  height?: number;
  className?: string;
  color?: string;
  valueFormatter?: (value: number) => string;
}

export function SimpleChart({
  title,
  data,
  loading,
  height = 200,
  className,
  color = "hsl(var(--chart-1))",
  valueFormatter = (value) => value.toString(),
}: SimpleChartProps) {
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className={`h-[${height}px] w-full`} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((point) => ({
    name: point.label,
    value: point.value,
    timestamp: point.timestamp,
  }));

  const chartConfig = {
    value: {
      label: "Value",
      color: color,
    },
  } satisfies ChartConfig;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: `${height}px` }}
        >
          <LineChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 10)}
            />
            <YAxis
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `${label}`}
                  formatter={(value) => [valueFormatter(Number(value)), "Value"]}
                />
              }
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-value)",
                strokeWidth: 2,
                r: 4,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Bar chart component for simpler data
interface SimpleBarChartProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  loading?: boolean;
  className?: string;
}

export function SimpleBarChart({
  title,
  data,
  loading,
  className,
}: SimpleBarChartProps) {
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: item.color || `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const chartConfig = data.reduce((config, item, index) => {
    const key = item.label.toLowerCase().replace(/\s+/g, "_");
    return {
      ...config,
      [key]: {
        label: item.label,
        color: item.color || `hsl(var(--chart-${(index % 5) + 1}))`,
      },
    };
  }, {} as ChartConfig);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    Number(value).toLocaleString(),
                    name,
                  ]}
                />
              }
            />
            <Bar dataKey="value" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
