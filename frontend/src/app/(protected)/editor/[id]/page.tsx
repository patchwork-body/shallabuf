import "@xyflow/react/dist/style.css";
import {
	ReactFlowProvider,
	type useEdgesState,
	type useNodesState,
} from "@xyflow/react";
import { NodeType } from "~/lib/dtos";
import { trpc } from "~/trpc/server";
import { Editor } from "./_components/editor";

type Params = Promise<{ id: string }>;

export default async function PipelineDetails(props: {
	params: Params;
}) {
	const { id } = await props.params;
	const pipeline = await trpc.pipeline.details({ id });
	const nodes = await trpc.node.list();

	const pipelineNodes: Parameters<typeof useNodesState>[0] = pipeline.nodes.map(
		(pipelineNode) => {
			const node = nodes.find((node) => node.id === pipelineNode.nodeId);

			return {
				id: pipelineNode.id,
				position: JSON.parse(pipelineNode.coords),
				type: NodeType.Task,
				data: {
					name: `${node?.name}:${pipelineNode.nodeVersion}`,
					config: node?.config,
					inputs: pipelineNode.inputs.map((input) => ({
						...input,
						controlled: pipeline.nodes.some((node) => {
							return node.outputs.some((output) => {
								return pipeline.connections.some((connection) => {
									return (
										connection.fromPipelineNodeOutputId === output.id &&
										connection.toPipelineNodeInputId === input.id
									);
								});
							});
						}),
					})),
					outputs: pipelineNode.outputs,
				},
			};
		},
	);

	const edges: Parameters<typeof useEdgesState>[0] = pipeline.connections.map(
		(connection) => ({
			id: connection.id,
			source:
				pipeline.nodes.find((node) => {
					return node.outputs.some((output) => {
						return output.id === connection.fromPipelineNodeOutputId;
					});
				})?.id ?? "",
			target:
				pipeline.nodes.find((node) => {
					return node.inputs.some((input) => {
						return input.id === connection.toPipelineNodeInputId;
					});
				})?.id ?? "",
			animated: true,
			deletable: true,
			focusable: true,
			sourceHandle: connection.fromPipelineNodeOutputId,
			targetHandle: connection.toPipelineNodeInputId,
			selectable: true,
		}),
	);

	return (
		<div className="grid min-h-screen font-[family-name:var(--font-geist-sans)]">
			<ReactFlowProvider>
				<Editor
					nodes={pipelineNodes}
					edges={edges}
					participants={pipeline.participants}
					availableNodes={nodes}
				/>
			</ReactFlowProvider>
		</div>
	);
}
