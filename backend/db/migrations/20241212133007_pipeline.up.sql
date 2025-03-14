-- Create 'visibility' enum type
CREATE TYPE visibility AS ENUM ('public', 'private');

-- Create 'exec_status' enum type
CREATE TYPE exec_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Create 'node_container_type' enum type
CREATE TYPE node_container_type AS ENUM ('wasm', 'docker');

-- Create 'templates' table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description VARCHAR,
    config JSONB NOT NULL,
    visibility visibility NOT NULL DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create 'pipelines' table
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description VARCHAR,
    from_template_id UUID,
    team_id UUID NOT NULL,
    trigger_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_template_id) REFERENCES templates(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT
);

-- Create 'nodes' table
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    identifier_name VARCHAR NOT NULL,
    publisher_name VARCHAR NOT NULL,
    version_name VARCHAR NOT NULL DEFAULT 'v1',
    version_id VARCHAR NOT NULL,
    description VARCHAR,
    config JSONB NOT NULL,
    container_type node_container_type NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    visibility visibility NOT NULL DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (identifier_name, publisher_name, version_id)
);

-- Create 'pipeline_execs' table
CREATE TABLE IF NOT EXISTS pipeline_execs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    status exec_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

-- Create 'pipeline_nodes' table
CREATE TABLE IF NOT EXISTS pipeline_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    node_id UUID NOT NULL,
    node_version VARCHAR NOT NULL,
    coords JSONB NOT NULL,
    is_trigger BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Create 'pipeline_node_execs' table
CREATE TABLE IF NOT EXISTS pipeline_node_execs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_exec_id UUID NOT NULL,
    pipeline_node_id UUID NOT NULL,
    status exec_status NOT NULL DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (pipeline_exec_id) REFERENCES pipeline_execs(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_node_id) REFERENCES pipeline_nodes(id) ON DELETE CASCADE
);

-- Create 'pipeline_node_inputs' table
CREATE TABLE IF NOT EXISTS pipeline_node_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR NOT NULL,
    pipeline_node_id UUID NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create 'pipeline_node_outputs' table
CREATE TABLE IF NOT EXISTS pipeline_node_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR NOT NULL,
    pipeline_node_id UUID NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create 'pipeline_node_connections' table
CREATE TABLE IF NOT EXISTS pipeline_node_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_pipeline_node_output_id UUID NOT NULL REFERENCES pipeline_node_outputs(id) ON DELETE CASCADE,
    to_pipeline_node_input_id UUID NOT NULL REFERENCES pipeline_node_inputs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_node_connections_to_pipeline_node_input_id
    ON pipeline_node_connections(to_pipeline_node_input_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_nodes_pipeline_id
    ON pipeline_nodes(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_nodes_name
    ON nodes(identifier_name, publisher_name, version_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_node_inputs_pipeline_node_id
    ON pipeline_node_inputs(pipeline_node_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_node_outputs_pipeline_node_id
    ON pipeline_node_outputs(pipeline_node_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_execs_pipeline_id
    ON pipeline_execs(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_node_execs_pipeline_node_id
    ON pipeline_node_execs(pipeline_node_id);

-- Create function to notify pipeline_exec_events channel
CREATE OR REPLACE FUNCTION notify_pipeline_exec_events()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('pipeline_exec_events', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create pipeline node inputs and outputs based on node configuration
CREATE OR REPLACE FUNCTION create_pipeline_node_io()
RETURNS trigger AS $$
DECLARE
    node_config JSONB;
BEGIN
    SELECT config INTO node_config FROM nodes WHERE id = NEW.node_id;

    -- Insert pipeline_node_inputs and handle multiple records
    INSERT INTO pipeline_node_inputs (key, pipeline_node_id)
    SELECT
        input->>'key',
        NEW.id
    FROM jsonb_array_elements(node_config->'inputs') AS input;

    -- Insert pipeline_node_outputs and handle multiple records
    INSERT INTO pipeline_node_outputs (key, pipeline_node_id)
    SELECT
        output->>'key',
        NEW.id
    FROM jsonb_array_elements(node_config->'outputs') AS output;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_updated_at_templates
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pipelines
BEFORE UPDATE ON pipelines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_nodes
BEFORE UPDATE ON nodes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pipeline_nodes
BEFORE UPDATE ON pipeline_nodes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pipeline_node_connections
BEFORE UPDATE ON pipeline_node_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pipeline_node_inputs
BEFORE UPDATE ON pipeline_node_inputs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pipeline_node_outputs
BEFORE UPDATE ON pipeline_node_outputs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notify_pipeline_execs_update
AFTER UPDATE ON pipeline_execs
FOR EACH ROW
EXECUTE FUNCTION notify_pipeline_exec_events();

CREATE TRIGGER notify_pipeline_node_execs_update
AFTER UPDATE ON pipeline_node_execs
FOR EACH ROW
EXECUTE FUNCTION notify_pipeline_exec_events();

CREATE TRIGGER create_pipeline_node_io_trigger
AFTER INSERT ON pipeline_nodes
FOR EACH ROW
EXECUTE FUNCTION create_pipeline_node_io();
