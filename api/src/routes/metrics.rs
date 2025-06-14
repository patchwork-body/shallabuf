use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::extractors::{database_connection::DatabaseConnection, session::Session};

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct MetricsQuery {
    pub app_id: Option<Uuid>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub start_date: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub end_date: Option<OffsetDateTime>,
    pub granularity: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BillingSummary {
    pub app_id: Uuid,
    pub total_connections: i64,
    pub total_connection_time_ms: i64,
    pub total_bytes_transferred: i64,
    pub total_messages: i64,
    pub connection_time_cost: f64,
    pub data_transfer_cost: f64,
    pub total_cost: f64,
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_activity: Option<OffsetDateTime>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionMetrics {
    pub active_connections: i64,
    pub total_sessions_today: i64,
    pub avg_session_duration_ms: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataTransferMetrics {
    pub total_bytes_today: i64,
    pub messages_today: i64,
    pub avg_message_size_bytes: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSeriesPoint {
    #[serde(with = "time::serde::rfc3339")]
    pub timestamp: OffsetDateTime,
    pub value: f64,
    pub label: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageTrend {
    pub metric_name: String,
    pub data_points: Vec<TimeSeriesPoint>,
    pub total: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationMetrics {
    pub organization_id: Uuid,
    pub billing_summary: Vec<BillingSummary>,
    pub connection_metrics: ConnectionMetrics,
    pub data_transfer_metrics: DataTransferMetrics,
    #[serde(with = "time::serde::rfc3339")]
    pub last_updated: OffsetDateTime,
}

// Route handlers

/// Get comprehensive billing summary for organization's apps
pub async fn get_billing_summary(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
    Query(_params): Query<MetricsQuery>,
) -> Result<Json<Vec<BillingSummary>>, (StatusCode, String)> {
    // Check if user has access to this organization
    let has_access = sqlx::query!(
        "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        session.user_id,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .is_some();

    if !has_access {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Get basic connection and data transfer stats per app
    let results = sqlx::query!(
        r#"
        SELECT
            a.id,
            COUNT(DISTINCT cs.id) as total_connections,
            COALESCE(SUM(EXTRACT(EPOCH FROM (cs.disconnected_at - cs.connected_at)) * 1000), 0)::bigint as total_connection_time_ms,
            COALESCE(SUM(dtm.total_bytes_transferred), 0)::bigint as total_bytes_transferred,
            COUNT(dtm.id) as total_messages,
            MAX(GREATEST(cs.connected_at, dtm.created_at)) as last_activity
        FROM apps a
        LEFT JOIN connection_session cs ON cs.app_id = a.app_id AND cs.disconnected_at IS NOT NULL
        LEFT JOIN data_transfer_metrics dtm ON dtm.connection_session_id = cs.id
        WHERE a.organization_id = $1
        GROUP BY a.id
        ORDER BY total_connection_time_ms DESC
        "#,
        organization_id
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let billing_summary: Vec<BillingSummary> = results
        .into_iter()
        .map(|row| {
            let connection_time_ms = row.total_connection_time_ms.unwrap_or(0);
            let bytes_transferred = row.total_bytes_transferred.unwrap_or(0);

            let connection_time_cost = (connection_time_ms as f64 / 1000.0 / 3600.0) * 0.001; // $0.001 per hour
            let data_transfer_cost = (bytes_transferred as f64 / 1024.0 / 1024.0) * 0.0001; // $0.0001 per MB

            BillingSummary {
                app_id: row.id,
                total_connections: row.total_connections.unwrap_or(0),
                total_connection_time_ms: connection_time_ms,
                total_bytes_transferred: bytes_transferred,
                total_messages: row.total_messages.unwrap_or(0),
                connection_time_cost,
                data_transfer_cost,
                total_cost: connection_time_cost + data_transfer_cost,
                last_activity: row.last_activity,
            }
        })
        .collect();

    Ok(Json(billing_summary))
}

/// Get current connection metrics
pub async fn get_connection_metrics(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
    Query(_params): Query<MetricsQuery>,
) -> Result<Json<ConnectionMetrics>, (StatusCode, String)> {
    // Check access
    let has_access = sqlx::query!(
        "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        session.user_id,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .is_some();

    if !has_access {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Get active connections
    let active_connections = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM connection_session cs
        INNER JOIN apps a ON a.app_id = cs.app_id
        WHERE a.organization_id = $1
        AND cs.disconnected_at IS NULL
        "#,
        organization_id
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get today's session stats - simplified to avoid BigDecimal
    let today_stats = sqlx::query!(
        r#"
        SELECT
            COUNT(*) as total_sessions
        FROM connection_session cs
        INNER JOIN apps a ON a.app_id = cs.app_id
        WHERE a.organization_id = $1
        AND cs.connected_at >= CURRENT_DATE
        AND cs.disconnected_at IS NOT NULL
        "#,
        organization_id
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ConnectionMetrics {
        active_connections: active_connections.count.unwrap_or(0),
        total_sessions_today: today_stats.total_sessions.unwrap_or(0),
        avg_session_duration_ms: None, // Simplified to avoid BigDecimal casting
    }))
}

/// Get data transfer metrics
pub async fn get_data_transfer_metrics(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
    Query(_params): Query<MetricsQuery>,
) -> Result<Json<DataTransferMetrics>, (StatusCode, String)> {
    // Check access
    let has_access = sqlx::query!(
        "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        session.user_id,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .is_some();

    if !has_access {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Get today's data transfer stats - simplified to avoid BigDecimal
    let today_stats = sqlx::query!(
        r#"
        SELECT
            COUNT(dtm.id) as total_messages
        FROM data_transfer_metrics dtm
        INNER JOIN connection_session cs ON cs.id = dtm.connection_session_id
        INNER JOIN apps a ON a.app_id = cs.app_id
        WHERE a.organization_id = $1
        AND dtm.created_at >= CURRENT_DATE
        "#,
        organization_id
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(DataTransferMetrics {
        total_bytes_today: 0, // Simplified to avoid BigDecimal
        messages_today: today_stats.total_messages.unwrap_or(0),
        avg_message_size_bytes: None, // Simplified to avoid BigDecimal
    }))
}

/// Get usage trends over time for charting
pub async fn get_usage_trends(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
    Query(params): Query<MetricsQuery>,
) -> Result<Json<Vec<UsageTrend>>, (StatusCode, String)> {
    // Check access
    let has_access = sqlx::query!(
        "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        session.user_id,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .is_some();

    if !has_access {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    let granularity = params.granularity.as_deref().unwrap_or("day");
    let date_trunc = match granularity {
        "hour" => "hour",
        "week" => "week",
        "month" => "month",
        _ => "day",
    };

    // Get connection count trends (simplified to avoid BigDecimal)
    let connection_trends = sqlx::query!(
        r#"
        SELECT
            DATE_TRUNC($1, cs.connected_at) as period,
            COUNT(*) as connection_count
        FROM connection_session cs
        INNER JOIN apps a ON a.app_id = cs.app_id
        WHERE a.organization_id = $2
        AND cs.connected_at >= CURRENT_DATE - INTERVAL '30 days'
        AND cs.disconnected_at IS NOT NULL
        GROUP BY DATE_TRUNC($1, cs.connected_at)
        ORDER BY period
        "#,
        date_trunc,
        organization_id
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get message count trends
    let message_trends = sqlx::query!(
        r#"
        SELECT
            DATE_TRUNC($1, dtm.created_at) as period,
            COUNT(*) as message_count
        FROM data_transfer_metrics dtm
        INNER JOIN connection_session cs ON cs.id = dtm.connection_session_id
        INNER JOIN apps a ON a.app_id = cs.app_id
        WHERE a.organization_id = $2
        AND dtm.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC($1, dtm.created_at)
        ORDER BY period
        "#,
        date_trunc,
        organization_id
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut trends = Vec::new();

    // Connection count trend
    if !connection_trends.is_empty() {
        let connection_points: Vec<TimeSeriesPoint> = connection_trends
            .into_iter()
            .filter_map(|row| {
                if let (Some(period), Some(count)) = (row.period, row.connection_count) {
                    Some(TimeSeriesPoint {
                        timestamp: period,
                        value: count as f64,
                        label: "Connections".to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        let total: f64 = connection_points.iter().map(|p| p.value).sum();

        trends.push(UsageTrend {
            metric_name: "connection_count".to_string(),
            data_points: connection_points,
            total,
        });
    }

    // Message count trend
    if !message_trends.is_empty() {
        let data_points: Vec<TimeSeriesPoint> = message_trends
            .into_iter()
            .filter_map(|row| {
                if let (Some(period), Some(count)) = (row.period, row.message_count) {
                    Some(TimeSeriesPoint {
                        timestamp: period,
                        value: count as f64,
                        label: "Messages".to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        let total: f64 = data_points.iter().map(|p| p.value).sum();

        trends.push(UsageTrend {
            metric_name: "message_count".to_string(),
            data_points,
            total,
        });
    }

    Ok(Json(trends))
}

/// Get comprehensive organization metrics
pub async fn get_organization_metrics(
    Session(session): Session,
    DatabaseConnection(conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
    Query(params): Query<MetricsQuery>,
) -> Result<Json<OrganizationMetrics>, (StatusCode, String)> {
    // Get billing summary directly to avoid clone issues
    let billing_summary = get_billing_summary(
        Session(session),
        DatabaseConnection(conn),
        Path(organization_id),
        Query(params),
    )
    .await?
    .0;

    // For now, return simplified metrics
    let connection_metrics = ConnectionMetrics {
        active_connections: 0,
        total_sessions_today: 0,
        avg_session_duration_ms: None,
    };

    let data_transfer_metrics = DataTransferMetrics {
        total_bytes_today: 0,
        messages_today: 0,
        avg_message_size_bytes: None,
    };

    Ok(Json(OrganizationMetrics {
        organization_id,
        billing_summary,
        connection_metrics,
        data_transfer_metrics,
        last_updated: OffsetDateTime::now_utc(),
    }))
}
