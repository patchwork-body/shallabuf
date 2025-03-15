-- Drop unique constraint
ALTER TABLE IF EXISTS casbin_rule DROP CONSTRAINT IF EXISTS unique_key_sqlx_adapter;

-- Drop trigger
DROP TRIGGER IF EXISTS set_updated_at_casbin_rule ON casbin_rule;

-- Drop indexes
DROP INDEX IF EXISTS idx_casbin_rule_ptype;
DROP INDEX IF EXISTS idx_casbin_rule_v0;
DROP INDEX IF EXISTS idx_casbin_rule_v1;
DROP INDEX IF EXISTS idx_casbin_rule_v2;
DROP INDEX IF EXISTS idx_casbin_rule_v3;
DROP INDEX IF EXISTS idx_casbin_rule_v4;
DROP INDEX IF EXISTS idx_casbin_rule_v5;

-- Drop table
DROP TABLE IF EXISTS casbin_rule;
