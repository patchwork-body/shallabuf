-- Drop trigger first
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;

-- Drop table
DROP TABLE IF EXISTS apps;
