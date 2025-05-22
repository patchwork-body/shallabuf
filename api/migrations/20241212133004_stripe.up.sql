-- Create stripe_configurations table for storing Stripe API keys and settings
CREATE TABLE IF NOT EXISTS stripe_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id VARCHAR NOT NULL UNIQUE,
    stripe_client_secret VARCHAR NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR NOT NULL UNIQUE,
    stripe_payment_method_id VARCHAR,
    is_test BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Create index for organization_id
CREATE INDEX idx_stripe_configurations_org_id ON stripe_configurations(organization_id);

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_stripe_configurations
BEFORE UPDATE ON stripe_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to update billing_connected status
CREATE OR REPLACE FUNCTION update_billing_connected_status()
RETURNS trigger AS $$
BEGIN
    -- On INSERT or UPDATE of stripe_configurations
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Only update billing_connected if stripe_payment_method_id is set
        IF NEW.stripe_payment_method_id IS NOT NULL THEN
            UPDATE organizations
            SET billing_connected = TRUE
            WHERE id = NEW.organization_id;
        ELSE
            UPDATE organizations
            SET billing_connected = FALSE
            WHERE id = NEW.organization_id;
        END IF;
        RETURN NEW;
    -- On DELETE of stripe_configurations
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE organizations
        SET billing_connected = FALSE
        WHERE id = OLD.organization_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update billing_connected status
CREATE TRIGGER update_org_billing_status
AFTER INSERT OR UPDATE OR DELETE ON stripe_configurations
FOR EACH ROW
EXECUTE FUNCTION update_billing_connected_status();
