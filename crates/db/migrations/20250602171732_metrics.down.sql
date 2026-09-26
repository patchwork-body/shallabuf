-- Drop views
DROP VIEW IF EXISTS v_current_month_billing;
DROP VIEW IF EXISTS v_billing_summary;

-- Drop triggers
DROP TRIGGER IF EXISTS calculate_connection_duration ON connection_session;
DROP TRIGGER IF EXISTS set_updated_at_billing_metrics ON billing_metrics;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_session_duration();
DROP FUNCTION IF EXISTS close_connection_session(UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_billing_metrics_app_id_fk;
DROP INDEX IF EXISTS idx_data_transfer_metrics_app_id_fk;
DROP INDEX IF EXISTS idx_connection_session_app_id_fk;

DROP INDEX IF EXISTS idx_billing_metrics_unique_period;
DROP INDEX IF EXISTS idx_billing_metrics_period;
DROP INDEX IF EXISTS idx_billing_metrics_app_user;
DROP INDEX IF EXISTS idx_billing_metrics_org_id;

DROP INDEX IF EXISTS idx_data_transfer_metrics_message_type;
DROP INDEX IF EXISTS idx_data_transfer_metrics_created_at;
DROP INDEX IF EXISTS idx_data_transfer_metrics_channel_id;
DROP INDEX IF EXISTS idx_data_transfer_metrics_connection_id;
DROP INDEX IF EXISTS idx_data_transfer_metrics_org_id;
DROP INDEX IF EXISTS idx_data_transfer_metrics_app_user;

DROP INDEX IF EXISTS idx_connection_session_disconnected_at;
DROP INDEX IF EXISTS idx_connection_session_connected_at;
DROP INDEX IF EXISTS idx_connection_session_org_id;
DROP INDEX IF EXISTS idx_connection_session_app_user;

-- Drop tables
DROP TABLE IF EXISTS billing_metrics;
DROP TABLE IF EXISTS data_transfer_metrics;
DROP TABLE IF EXISTS connection_session;

-- Drop enum types
DROP TYPE IF EXISTS message_type;
DROP TYPE IF EXISTS connection_event_type;
