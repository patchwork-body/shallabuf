-- Create enum types for metrics
CREATE TYPE message_type AS ENUM ('init', 'patch', 'broadcast');

-- Table to track WebSocket connection sessions for billing
CREATE TABLE IF NOT EXISTS connection_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(32) NOT NULL REFERENCES apps(app_id),
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT
);

-- Function to close a connection session and calculate duration
CREATE OR REPLACE FUNCTION close_connection_session(session_id UUID)
RETURNS RECORD AS $$
DECLARE
    result RECORD;
BEGIN
    -- Update the session to set disconnected_at and calculate duration
    UPDATE connection_session
    SET
        disconnected_at = timezone('UTC', CURRENT_TIMESTAMP),
        duration_ms = EXTRACT(EPOCH FROM (timezone('UTC', CURRENT_TIMESTAMP) - connected_at)) * 1000
    WHERE id = session_id
    AND disconnected_at IS NULL
    RETURNING id, duration_ms, disconnected_at INTO result;

    -- Return the result (will be NULL if no rows updated)
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Table to track data transfer for billing (bytes transferred)
CREATE TABLE IF NOT EXISTS data_transfer_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_session_id UUID NOT NULL REFERENCES connection_session(id) ON DELETE CASCADE,
    channel_id VARCHAR NOT NULL,
    message_type message_type NOT NULL,
    message_size_bytes INTEGER NOT NULL, -- Size of message in bytes
    recipient_count INTEGER NOT NULL DEFAULT 1, -- Number of users who received this message
    total_bytes_transferred BIGINT GENERATED ALWAYS AS (message_size_bytes * recipient_count) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Table for aggregated billing metrics (updated periodically for efficient billing)
CREATE TABLE IF NOT EXISTS billing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(32) NOT NULL REFERENCES apps(app_id),
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_connection_time_ms BIGINT NOT NULL DEFAULT 0,
    total_bytes_transferred BIGINT NOT NULL DEFAULT 0,
    total_messages_sent INTEGER NOT NULL DEFAULT 0,
    total_init_messages INTEGER NOT NULL DEFAULT 0,
    total_patch_messages INTEGER NOT NULL DEFAULT 0,
    total_broadcast_messages INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Indexes for connection_session
CREATE INDEX idx_connection_session_app_id ON connection_session(app_id);
CREATE INDEX idx_connection_session_connected_at ON connection_session(connected_at);
CREATE INDEX idx_connection_session_disconnected_at ON connection_session(disconnected_at);

-- Indexes for data_transfer_metrics
CREATE INDEX idx_data_transfer_metrics_connection_session_id ON data_transfer_metrics(connection_session_id);
CREATE INDEX idx_data_transfer_metrics_channel_id ON data_transfer_metrics(channel_id);
CREATE INDEX idx_data_transfer_metrics_created_at ON data_transfer_metrics(created_at);
CREATE INDEX idx_data_transfer_metrics_message_type ON data_transfer_metrics(message_type);

-- Indexes for billing_metrics
CREATE INDEX idx_billing_metrics_app_id ON billing_metrics(app_id);
CREATE INDEX idx_billing_metrics_period ON billing_metrics(billing_period_start, billing_period_end);
CREATE UNIQUE INDEX idx_billing_metrics_unique_period ON billing_metrics(app_id, billing_period_start, billing_period_end);

-- Add foreign key constraints where possible
CREATE INDEX idx_connection_session_app_id_fk ON connection_session(app_id);
CREATE INDEX idx_billing_metrics_app_id_fk ON billing_metrics(app_id);

-- Trigger for billing_metrics updated_at
CREATE TRIGGER set_updated_at_billing_metrics
BEFORE UPDATE ON billing_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- View for real-time billing calculations
CREATE OR REPLACE VIEW v_billing_summary AS
SELECT
    cm.app_id,
    COUNT(cm.id) as total_connections,
    COALESCE(SUM(cm.duration_ms), 0) as total_connection_time_ms,
    COALESCE(SUM(dtm.total_bytes_transferred), 0) as total_bytes_transferred,
    COUNT(dtm.id) as total_messages,
    COUNT(CASE WHEN dtm.message_type = 'init' THEN 1 END) as init_messages,
    COUNT(CASE WHEN dtm.message_type = 'patch' THEN 1 END) as patch_messages,
    COUNT(CASE WHEN dtm.message_type = 'broadcast' THEN 1 END) as broadcast_messages,
    MAX(GREATEST(cm.connected_at, dtm.created_at)) as last_activity
FROM connection_session cm
LEFT JOIN data_transfer_metrics dtm ON (
    cm.id = dtm.connection_session_id
)
WHERE cm.disconnected_at IS NOT NULL -- Only count completed sessions
GROUP BY cm.app_id;

-- View for current month billing
CREATE OR REPLACE VIEW v_current_month_billing AS
SELECT
    app_id,
    total_connection_time_ms,
    total_bytes_transferred,
    total_messages,
    -- Calculate costs (customize these rates as needed)
    ROUND((total_connection_time_ms::DECIMAL / 1000 / 3600) * 0.001, 6) as connection_time_cost, -- $0.001 per hour
    ROUND((total_bytes_transferred::DECIMAL / 1024 / 1024) * 0.0001, 6) as data_transfer_cost, -- $0.0001 per MB
    last_activity
FROM v_billing_summary
WHERE last_activity >= date_trunc('month', CURRENT_TIMESTAMP);
