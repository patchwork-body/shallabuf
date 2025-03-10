import "@xyflow/react/dist/style.css";
import {
	ReactFlowProvider,
	type useEdgesState,
	type useNodesState,
} from "@xyflow/react";
import { Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { getSessionToken } from "~/lib/auth";
import { type Node, NodeType, type Pipeline } from "~/lib/dtos";
import { Editor } from "./_components/editor";

type Params = Promise<{ id: string }>;

export default async function PipelineDetails(props: {
	params: Params;
}) {
	const params = await props.params;
	const sessionToken = await getSessionToken();

	let pipeline: Pipeline;
	let availableNodes: Node[] = [];

	try {
		const response = await fetch(
			`${env.API_URL}/pipelines/${params.id}?withParticipants=includeMyself`,
			{
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: `Bearer ${sessionToken}`,
				},
			},
		);

		pipeline = await response.json();
	} catch (error) {
		console.error(error);
		return <div>Failed to fetch pipeline</div>;
	}

	try {
		const response = await fetch(`${env.API_URL}/nodes`, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${sessionToken}`,
			},
		});

		availableNodes = await response.json();
	} catch (error) {
		console.error(error);
		return <div>Failed to fetch nodes</div>;
	}

	const nodes: Parameters<typeof useNodesState>[0] = pipeline.nodes.map(
		(pipelineNode) => {
			const node = availableNodes.find(
				(available_node) => available_node.id === pipelineNode.nodeId,
			);

			return {
				id: pipelineNode.id,
				position: pipelineNode.coords,
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
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
			<h1 className="text-3xl font-bold text-center">
				<Button>
					<Link href="/pipelines">
						<div className="flex items-center space-x-2">
							<LinkIcon />
							<span>Back</span>
						</div>
					</Link>
				</Button>
				{pipeline.name}
			</h1>

			<ReactFlowProvider>
				<Editor
					nodes={nodes}
					edges={edges}
					participants={pipeline.participants ?? []}
					availableNodes={availableNodes}
				/>
			</ReactFlowProvider>
		</div>
	);
}
