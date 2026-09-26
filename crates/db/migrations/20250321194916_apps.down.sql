-- Drop triggers
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;

-- Drop indexes
DROP INDEX IF EXISTS idx_apps_organization_id ON apps;
DROP INDEX IF EXISTS idx_apps_app_id ON apps;

-- Drop tables
DROP TABLE IF EXISTS apps;
