-- Create enum type for invite status
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Create 'invites' table
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    status invite_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Create indexes
CREATE INDEX idx_invites_organization_id ON invites(organization_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- Create unique constraint to prevent duplicate pending invites for same email+org
CREATE UNIQUE INDEX idx_invites_unique_pending ON invites(organization_id, email)
WHERE status = 'pending';

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at_invites
BEFORE UPDATE ON invites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
