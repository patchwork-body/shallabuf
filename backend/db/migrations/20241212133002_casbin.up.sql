-- Create Casbin rules table
CREATE TABLE IF NOT EXISTS casbin_rules (
    id SERIAL PRIMARY KEY,
    ptype VARCHAR(10),
    v0 VARCHAR(256),
    v1 VARCHAR(256),
    v2 VARCHAR(256),
    v3 VARCHAR(256),
    v4 VARCHAR(256),
    v5 VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_key_sqlx_adapter UNIQUE(ptype, v0, v1, v2, v3, v4, v5)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_casbin_rules_ptype ON casbin_rules(ptype);
CREATE INDEX IF NOT EXISTS idx_casbin_rules_v0 ON casbin_rules(v0);
CREATE INDEX IF NOT EXISTS idx_casbin_rules_v1 ON casbin_rules(v1);
CREATE INDEX IF NOT EXISTS idx_casbin_rules_v2 ON casbin_rules(v2);
CREATE INDEX IF NOT EXISTS idx_casbin_rules_v3 ON casbin_rules(v3);
CREATE INDEX IF NOT EXISTS idx_casbin_rules_v4 ON casbin_rules(v4);
CREATE INDEX IF NOT EXISTS idx_casbin_rules_v5 ON casbin_rules(v5);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at_casbin_rule
BEFORE UPDATE ON casbin_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default policies
INSERT INTO casbin_rules (ptype, v0, v1, v2, v3, v4, v5) VALUES
-- Admin permissions
('p', 'admin', 'teams', 'pipelines', 'read', '*', '*'),
('p', 'admin', 'teams', 'pipelines', 'write', '*', '*'),
('p', 'admin', 'teams', 'pipelines', 'delete', '*', '*'),
('p', 'admin', 'teams', 'nodes', 'read', '*', '*'),
('p', 'admin', 'teams', 'nodes', 'write', '*', '*'),
('p', 'admin', 'teams', 'nodes', 'delete', '*', '*'),
('p', 'admin', 'teams', 'members', 'read', '*', '*'),
('p', 'admin', 'teams', 'members', 'write', '*', '*'),
('p', 'admin', 'teams', 'members', 'delete', '*', '*'),

-- Editor permissions
('p', 'editor', 'teams', 'pipelines', 'read', '*', '*'),
('p', 'editor', 'teams', 'pipelines', 'write', '*', '*'),
('p', 'editor', 'teams', 'nodes', 'read', '*', '*'),
('p', 'editor', 'teams', 'nodes', 'write', '*', '*'),
('p', 'editor', 'teams', 'members', 'read', '*', '*'),
('p', 'editor', 'teams', 'members', 'write', '*', '*'),
('p', 'editor', 'teams', 'members', 'delete', '*', '*'),

-- Viewer permissions
('p', 'viewer', 'teams', 'pipelines', 'read', '*', '*'),
('p', 'viewer', 'teams', 'nodes', 'read', '*', '*'),
('p', 'viewer', 'teams', 'members', 'read', '*', '*');
