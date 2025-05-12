-- Drop triggers
DROP TRIGGER IF EXISTS set_updated_at_organizations ON organizations;
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
DROP TRIGGER IF EXISTS set_updated_at_user_organizations ON user_organizations;
DROP TRIGGER IF EXISTS set_updated_at_keys ON keys;

-- Drop tables
DROP TABLE IF EXISTS keys;
DROP TABLE IF EXISTS user_organizations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

-- Drop index
DROP INDEX IF EXISTS idx_users_email;

-- Drop enum type
DROP TYPE IF EXISTS provider_enum;
