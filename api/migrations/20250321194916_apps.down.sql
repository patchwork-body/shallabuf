-- Add down migration script here

-- Drop trigger first
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;

-- Drop table
DROP TABLE IF EXISTS apps;

-- Note: We don't drop the pgcrypto extension as it might be used by other tables
