-- Drop indexes
DROP INDEX IF EXISTS idx_stripe_configurations_org_id;

-- Drop triggers
DROP TRIGGER IF EXISTS set_updated_at_stripe_configurations ON stripe_configurations;
DROP TRIGGER IF EXISTS update_org_billing_status ON stripe_configurations;

-- Drop function
DROP FUNCTION IF EXISTS update_billing_connected_status();

-- Drop stripe_configurations table
DROP TABLE IF EXISTS stripe_configurations CASCADE;