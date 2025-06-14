import { createServerFn } from "@tanstack/react-start";
import { object, optional, pipe, string, minLength } from "valibot";
import { env } from "~/env";
import { authorizationMiddleware } from "~/middlewares/authorization-middleware";

// Types for metrics responses (updated to match new API)
export interface BillingSummary {
  appId: string;
  totalConnections: number;
  totalConnectionTimeMs: number;
  totalBytesTransferred: number;
  totalMessages: number;
  connectionTimeCost: number;
  dataTransferCost: number;
  totalCost: number;
  lastActivity: string | null;
}

export interface ConnectionMetrics {
  activeConnections: number;
  totalSessionsToday: number;
  avgSessionDurationMs: number | null;
}

export interface DataTransferMetrics {
  totalBytesToday: number;
  messagesToday: number;
  avgMessageSizeBytes: number | null;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label: string;
}

export interface UsageTrend {
  metricName: string;
  dataPoints: TimeSeriesPoint[];
  total: number;
}

export interface OrganizationMetrics {
  organizationId: string;
  billingSummary: BillingSummary[];
  connectionMetrics: ConnectionMetrics;
  dataTransferMetrics: DataTransferMetrics;
  lastUpdated: string;
}

// Get billing summary for organization
export const metricsGetBillingSummaryFn = createServerFn({
  method: "GET",
})
  .validator(
    object({
      organizationId: pipe(string(), minLength(1)),
      startDate: optional(string()),
      endDate: optional(string()),
      appId: optional(string()),
      granularity: optional(string()),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<BillingSummary[]>(async ({ data, context }) => {
    const params = new URLSearchParams();
    if (data.startDate) params.set("startDate", data.startDate);
    if (data.endDate) params.set("endDate", data.endDate);
    if (data.appId) params.set("appId", data.appId);
    if (data.granularity) params.set("granularity", data.granularity);

    const response = await fetch(
      `${env.API_URL}/metrics/organizations/${data.organizationId}/billing?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, response.statusText, errorText);
      console.error('URL:', `${env.API_URL}/metrics/organizations/${data.organizationId}/billing?${params.toString()}`);
      throw new Error(`Failed to fetch billing summary: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  });

// Get connection metrics for organization
export const metricsGetConnectionMetricsFn = createServerFn({
  method: "GET",
})
  .validator(
    object({
      organizationId: pipe(string(), minLength(1)),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<ConnectionMetrics>(async ({ data, context }) => {
    const response = await fetch(
      `${env.API_URL}/metrics/organizations/${data.organizationId}/connections`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch connection metrics");
    }

    return response.json();
  });

// Get data transfer metrics for organization
export const metricsGetDataTransferMetricsFn = createServerFn({
  method: "GET",
})
  .validator(
    object({
      organizationId: pipe(string(), minLength(1)),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<DataTransferMetrics>(async ({ data, context }) => {
    const response = await fetch(
      `${env.API_URL}/metrics/organizations/${data.organizationId}/data-transfer`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch data transfer metrics");
    }

    return response.json();
  });

// Get usage trends for charting
export const metricsGetUsageTrendsFn = createServerFn({
  method: "GET",
})
  .validator(
    object({
      organizationId: pipe(string(), minLength(1)),
      granularity: optional(string()),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<UsageTrend[]>(async ({ data, context }) => {
    const params = new URLSearchParams();
    if (data.granularity) params.set("granularity", data.granularity);

    const response = await fetch(
      `${env.API_URL}/metrics/organizations/${data.organizationId}/usage-trends?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch usage trends");
    }

    return response.json();
  });

// Get comprehensive organization metrics
export const metricsGetOrganizationSummaryFn = createServerFn({
  method: "GET",
})
  .validator(
    object({
      organizationId: pipe(string(), minLength(1)),
      startDate: optional(string()),
      endDate: optional(string()),
      granularity: optional(string()),
    })
  )
  .middleware([authorizationMiddleware])
  .handler<OrganizationMetrics>(async ({ data, context }) => {
    const params = new URLSearchParams();
    if (data.startDate) params.set("startDate", data.startDate);
    if (data.endDate) params.set("endDate", data.endDate);
    if (data.granularity) params.set("granularity", data.granularity);

    const response = await fetch(
      `${env.API_URL}/metrics/organizations/${data.organizationId}/summary?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${context.sessionToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch organization metrics");
    }

    return response.json();
  });
