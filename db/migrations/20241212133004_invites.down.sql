-- Drop trigger
DROP TRIGGER IF EXISTS set_updated_at_invites ON invites;

-- Drop indexes
DROP INDEX IF EXISTS idx_invites_unique_pending;
DROP INDEX IF EXISTS idx_invites_expires_at;
DROP INDEX IF EXISTS idx_invites_status;
DROP INDEX IF EXISTS idx_invites_email;
DROP INDEX IF EXISTS idx_invites_organization_id;

-- Drop table
DROP TABLE IF EXISTS invites;

-- Drop enum type
DROP TYPE IF EXISTS invite_status;
