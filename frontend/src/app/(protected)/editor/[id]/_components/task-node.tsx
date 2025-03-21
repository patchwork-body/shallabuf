import { Label } from "@radix-ui/react-label";
import {
	Handle,
	type Node,
	type NodeProps,
	Position,
	useReactFlow,
} from "@xyflow/react";
import {
	Check as CheckIcon,
	Image as ImageIcon,
	Text as TextIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback } from "react";
import { NodeInput } from "~/components/features/pipeline/node-input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { Separator } from "~/components/ui/separator";
import type { ExecStatus, Pipeline, TaskNodeConfig } from "~/lib/dtos";
import { trpc } from "~/trpc/client";

export type TaskNodeProps = Node<
	{
		id: string;
		name: string;
		execStatus?: ExecStatus;
		result?: Record<string, unknown>;
		config?: TaskNodeConfig;
		inputs: Array<
			Pipeline["nodes"][number]["inputs"][number] & { controlled: boolean }
		>;
		outputs: Pipeline["nodes"][number]["outputs"];
	},
	"task"
>;

export const TaskNode = ({ data, isConnectable }: NodeProps<TaskNodeProps>) => {
	const deletePipelineNodeMutation = trpc.pipelineNode.delete.useMutation();
	const { setNodes } = useReactFlow();

	const deletePipelineNode = useCallback(async () => {
		await deletePipelineNodeMutation.mutateAsync({ id: data.id });

		setNodes((nodes) => {
			return nodes.filter((node) => node.id !== data.id);
		});
	}, [deletePipelineNodeMutation, data.id, setNodes]);

	return (
		<ContextMenu>
			<ContextMenuTrigger>
				<Card>
					<CardHeader>
						<CardTitle>
							{data.name} {data.execStatus}
						</CardTitle>
					</CardHeader>

					<CardContent>
						{data.config?.inputs.map(({ key, label, input }) => {
							const inputHandle = data.inputs.find(
								(input) => input.key === key,
							);

							return (
								<div key={key} className="relative not-first:mt-2">
									<Handle
										key={key}
										id={data.inputs.find((input) => input.key === key)?.id}
										type="target"
										position={Position.Left}
										isConnectable={isConnectable}
										style={{
											left: "-1.5rem",
											transform: "translate(-50%, 8px)",
										}}
									/>

									<NodeInput label={label.en} input={input} />
								</div>
							);
						})}

						<Separator className="my-4" />

						{data.config?.outputs.map(({ key, label, output }) => (
							<div
								key={key}
								className="relative flex items-center not-first:mt-2"
							>
								<Label>{label.en}</Label>

								{output === "text" && <TextIcon className="ml-auto" />}
								{output === "status" && <CheckIcon className="ml-auto" />}
								{output === "binary" && <ImageIcon className="ml-auto" />}

								<Handle
									id={data.outputs.find((output) => output.key === key)?.id}
									type="source"
									style={{
										right: "-1.5rem",
										transform: "translate(50%, -50%)",
									}}
									position={Position.Right}
									isConnectable={isConnectable}
								/>
							</div>
						))}
					</CardContent>
				</Card>
			</ContextMenuTrigger>

			<ContextMenuContent>
				<ContextMenuItem asChild>
					<Button
						variant="ghost"
						className="w-full"
						onClick={deletePipelineNode}
					>
						<Trash2Icon />
						Delete
					</Button>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
};
