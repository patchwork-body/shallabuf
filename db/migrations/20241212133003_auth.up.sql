-- Create 'organizations' table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    billing_connected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

CREATE INDEX idx_organizations_name ON organizations(name);

-- Create 'users' table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Create index for 'email' field in 'users' table
CREATE INDEX idx_users_email ON users(email);

-- Create 'user_organizations' table
CREATE TABLE IF NOT EXISTS user_organizations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, organization_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Create enum type for provider
CREATE TYPE key_provider_type AS ENUM ('password', 'github', 'google', 'facebook');

-- Create 'keys' table
CREATE TABLE IF NOT EXISTS keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider key_provider_type NOT NULL,
    provider_key VARCHAR NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP)
);

-- Create triggers
CREATE TRIGGER set_updated_at_organizations
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_user_organizations
BEFORE UPDATE ON user_organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_keys
BEFORE UPDATE ON keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
