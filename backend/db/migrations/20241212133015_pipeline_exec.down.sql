DROP TRIGGER IF EXISTS cancel_descendant_pending_node_execs_trigger ON pipeline_node_execs;
DROP FUNCTION IF EXISTS cancel_descendant_pending_node_execs();
DROP TRIGGER IF EXISTS pipeline_node_execs_trigger ON pipeline_node_execs;
DROP TRIGGER IF EXISTS pipeline_execs_trigger ON pipeline_execs;
DROP FUNCTION IF EXISTS notify_pipeline_execs_event();
