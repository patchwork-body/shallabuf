import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import {
  metricsGetBillingSummaryFn,
  metricsGetConnectionMetricsFn,
  metricsGetDataTransferMetricsFn,
  metricsGetUsageTrendsFn,
} from "~/server-functions/metrics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  DollarSign,
  Users,
  Download,
  TrendingUp,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/_protected/orgs/$orgId/metrics/")({
  component: MetricsPage,
});

function MetricsPage() {
  const { orgId } = Route.useParams();
  const [granularity, setGranularity] = useState("day");

  // Fetch all metrics data
  const { data: billingSummary } = useSuspenseQuery({
    queryKey: ["billing-summary", orgId],
    queryFn: () =>
      metricsGetBillingSummaryFn({ data: { organizationId: orgId } }),
  });

  const { data: connectionMetrics } = useSuspenseQuery({
    queryKey: ["connection-metrics", orgId],
    queryFn: () =>
      metricsGetConnectionMetricsFn({ data: { organizationId: orgId } }),
  });

  const { data: dataTransferMetrics } = useSuspenseQuery({
    queryKey: ["data-transfer-metrics", orgId],
    queryFn: () =>
      metricsGetDataTransferMetricsFn({ data: { organizationId: orgId } }),
  });

  const { data: usageTrends } = useSuspenseQuery({
    queryKey: ["usage-trends", orgId, granularity],
    queryFn: () =>
      metricsGetUsageTrendsFn({ data: { organizationId: orgId, granularity } }),
  });

  // Calculate totals
  const totalCost = billingSummary.reduce((sum, app) => sum + app.totalCost, 0);
  const totalConnections = billingSummary.reduce(
    (sum, app) => sum + app.totalConnections,
    0
  );
  const totalMessages = billingSummary.reduce(
    (sum, app) => sum + app.totalMessages,
    0
  );
  const totalBytes = billingSummary.reduce(
    (sum, app) => sum + app.totalBytesTransferred,
    0
  );

  // Prepare chart data
  const connectionTrend = usageTrends.find(
    (trend) => trend.metricName === "connection_count"
  );
  const messageTrend = usageTrends.find(
    (trend) => trend.metricName === "message_count"
  );

  const chartData =
    connectionTrend?.dataPoints.map((point) => ({
      timestamp: new Date(point.timestamp).toLocaleDateString(),
      connections: point.value,
      messages:
        messageTrend?.dataPoints.find((m) => m.timestamp === point.timestamp)
          ?.value || 0,
    })) || [];

  // Pie chart data for cost breakdown
  const costBreakdownData = billingSummary.map((app) => ({
    name: app.appId,
    value: app.totalCost,
    connectionCost: app.connectionTimeCost,
    dataCost: app.dataTransferCost,
  }));

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Metrics</h1>
          <p className="text-gray-600">
            Monitor your organization's usage and billing
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Hourly</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Connections
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectionMetrics.activeConnections}
            </div>
            <p className="text-xs text-muted-foreground">Currently connected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Today
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dataTransferMetrics.messagesToday.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total messages sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Transfer</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalBytes / 1024 / 1024).toFixed(1)} MB
            </div>
            <p className="text-xs text-muted-foreground">Total transferred</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Trends</CardTitle>
            <CardDescription>
              Connections and messages over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="connections"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Connections"
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Messages"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by App</CardTitle>
            <CardDescription>
              Distribution of costs across applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value.toFixed(4)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `$${Number(value).toFixed(4)}`,
                    "Cost",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Apps Billing Details */}
      <Card>
        <CardHeader>
          <CardTitle>Application Billing Details</CardTitle>
          <CardDescription>
            Detailed breakdown of usage and costs per application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingSummary.map((app) => (
              <div
                key={app.appId}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">{app.appId}</Badge>
                    <div className="text-sm text-gray-600">
                      {app.totalConnections} connections •{" "}
                      {app.totalMessages.toLocaleString()} messages
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Connection time:{" "}
                    {(app.totalConnectionTimeMs / 1000 / 3600).toFixed(1)} hours
                    • Data:{" "}
                    {(app.totalBytesTransferred / 1024 / 1024).toFixed(1)} MB
                  </div>
                  {app.lastActivity && (
                    <div className="mt-1 text-xs text-gray-400">
                      Last activity:{" "}
                      {new Date(app.lastActivity).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    ${app.totalCost.toFixed(4)}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>Connection: ${app.connectionTimeCost.toFixed(4)}</div>
                    <div>Data: ${app.dataTransferCost.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Session Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sessions Today:</span>
                <span className="font-medium">
                  {connectionMetrics.totalSessionsToday}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Duration:</span>
                <span className="font-medium">
                  {connectionMetrics.avgSessionDurationMs
                    ? `${(connectionMetrics.avgSessionDurationMs / 1000 / 60).toFixed(1)} min`
                    : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Data Transfer</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Bytes Today:</span>
                <span className="font-medium">
                  {(dataTransferMetrics.totalBytesToday / 1024 / 1024).toFixed(
                    1
                  )}{" "}
                  MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Message Size:</span>
                <span className="font-medium">
                  {dataTransferMetrics.avgMessageSizeBytes
                    ? `${(dataTransferMetrics.avgMessageSizeBytes / 1024).toFixed(1)} KB`
                    : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Activity Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Apps:</span>
                <span className="font-medium">{billingSummary.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cost/Connection:</span>
                <span className="font-medium">
                  $
                  {totalConnections > 0
                    ? (totalCost / totalConnections).toFixed(6)
                    : "0.000000"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
