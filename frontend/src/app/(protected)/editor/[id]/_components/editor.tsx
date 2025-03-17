"use client";
import {
	Background,
	BackgroundVariant,
	type Edge,
	type OnConnect,
	Panel,
	ReactFlow,
	type ReactFlowProps,
	addEdge,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import {
	ArrowBigLeftIcon,
	MousePointer2,
	PlusIcon,
	TriangleIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import type React from "react";
import {
	type MouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { createPipelineNodeAction } from "~/actions/create-pipeline-node";
import { createPipelineNodeConnectionAction } from "~/actions/create-pipeline-node-connection";
import { createPipelineTriggerConnectionAction } from "~/actions/create-pipeline-trigger-connection";
import { updatePipelineNodeAction } from "~/actions/update-pipeline-node";
import { updatePipelineTriggerAction } from "~/actions/update-pipeline-trigger";
import { Button } from "~/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useWsStore } from "~/contexts/ws-store-context";
import { env } from "~/env";
import {
	type Node,
	NodeType,
	type PipelineExecNotification,
	type PipelineNode,
	type PipelineNodeConnection,
	type PipelineParticipant,
} from "~/lib/dtos";
import type { WsStoreState } from "~/stores/ws-store";
import { trpc } from "~/trpc/client";
import { TaskNode } from "./task-node";

export interface EditorProps {
	nodes: Parameters<typeof useNodesState>[0];
	edges: Parameters<typeof useEdgesState>[0];
	participants: PipelineParticipant[];
	availableNodes: Node[];
}

const nodeTypes: ReactFlowProps["nodeTypes"] = {
	task: TaskNode,
};

export const Editor = (props: EditorProps) => {
	const router = useRouter();
	const [nodes, setNodes, onNodesChange] = useNodesState(props.nodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(props.edges);
	const params = useParams();
	const pipelineId = params.id as string;
	const [execId, setExecId] = useQueryState("exec");
	const [contextMenuPosition, setContextMenuPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const _clearTaskNodes = useCallback(() => {
		setNodes((nodes) => {
			return nodes.map((node) => {
				if (node.type === NodeType.Task) {
					return {
						...node,
						data: {
							...node.data,
							execStatus: undefined,
							result: undefined,
						},
					};
				}

				return node;
			});
		});
	}, [setNodes]);

	useEffect(() => {
		if (execId) {
			const eventSource = new EventSource(
				`${env.NEXT_PUBLIC_API_URL}/pipeline-execs/${execId}/events`,
			);

			eventSource.onmessage = (event) => {
				const notification: PipelineExecNotification = JSON.parse(event.data);

				if (notification.type === "pipeline") {
					setNodes((nodes) => {
						return nodes.map((node) => {
							if (node.type === NodeType.Trigger) {
								return {
									...node,
									data: {
										...node.data,
										execStatus: notification.data.status,
									},
								};
							}

							return node;
						});
					});

					if (
						notification.data.status === "completed" ||
						notification.data.status === "failed" ||
						notification.data.status === "cancelled"
					) {
						setExecId(null);
						// clearTaskNodes();
						eventSource.close();
					}
				}

				if (notification.type === "node") {
					setNodes((nodes) => {
						return nodes.map((node) => {
							if (node.id === notification.data.pipelineNodeId) {
								return {
									...node,
									data: {
										...node.data,
										result: notification.data.result,
										execStatus: notification.data.status,
									},
								};
							}

							return node;
						});
					});
				}
			};

			eventSource.onerror = (event) => {
				setExecId(null);
				// clearTaskNodes();
				console.error(event);
			};
		}
	}, [execId, setNodes, setExecId]);

	const [
		participants,
		subscribeForNodeUpdates,
		initPipelineParticipants,
		enterPipelineEditor,
		leavePipelineEditor,
		updateCursorPosition,
		updateNodePosition,
	] = useWsStore(
		useShallow((state) => [
			state.pipelinesParticipants[pipelineId] ?? {},
			state.subscribeForNodeUpdates,
			state.initPipelineParticipants,
			state.enterPipelineEditor,
			state.leavePipelineEditor,
			state.updateCursorPosition,
			state.updateNodePosition,
		]),
	);

	useEffect(() => {
		return subscribeForNodeUpdates(pipelineId, (update) => {
			setNodes((nodes) => {
				const node = nodes.find((node) => node.id === update.nodeId);

				if (!node) {
					return nodes;
				}

				return [
					...nodes.filter((node) => node.id !== update.nodeId),
					{
						...node,
						position: update.nodePosition,
					},
				];
			});
		});
	}, [pipelineId, setNodes, subscribeForNodeUpdates]);

	const onConnect: OnConnect = useCallback(
		async (params) => {
			const commonEdgeParams: Partial<Edge> = {
				animated: true,
				deletable: true,
				focusable: true,
				selectable: true,
			};

			if (
				nodes.find((node) => node.id === params.source)?.type ===
				NodeType.Trigger
			) {
				const pipelineNode: PipelineNode =
					await createPipelineTriggerConnectionAction({
						triggerId: params.source,
						nodeId: params.target,
					});

				setNodes((nodes) => {
					return nodes.map((node) => {
						if (node.id === pipelineNode.id) {
							return {
								...node,
								data: {
									...node.data,
									triggerId: pipelineNode.triggerId,
								},
							};
						}

						return node;
					});
				});

				setEdges((eds) => {
					return addEdge(
						{
							...commonEdgeParams,
							id: pipelineNode.triggerId ?? "",
							source: pipelineNode.triggerId ?? "",
							target: pipelineNode.id,
						},
						eds,
					);
				});
			} else {
				console.log(params);

				if (!params.sourceHandle || !params.targetHandle) {
					return;
				}

				const connection: PipelineNodeConnection =
					await createPipelineNodeConnectionAction({
						fromPipelineNodeOutputId: params.sourceHandle,
						toPipelineNodeInputId: params.targetHandle,
					});

				setEdges((eds) => {
					return addEdge(
						{
							...commonEdgeParams,
							id: connection.id,
							source: params.source,
							target: params.target,
							sourceHandle: connection.fromPipelineNodeOutputId,
							targetHandle: connection.toPipelineNodeInputId,
						},
						eds,
					);
				});
			}
		},
		[nodes, setEdges, setNodes],
	);

	useEffect(() => {
		initPipelineParticipants(
			pipelineId,
			props.participants.reduce(
				(acc, participant) => {
					acc[participant.id] = {
						username: participant.name,
					};
					return acc;
				},
				{} as WsStoreState["pipelinesParticipants"][string],
			),
		);
	}, [initPipelineParticipants, props.participants, pipelineId]);

	useEffect(() => {
		enterPipelineEditor(pipelineId);

		return () => {
			leavePipelineEditor(pipelineId);
		};
	}, [enterPipelineEditor, leavePipelineEditor, pipelineId]);

	const broadcastNodePosition: NonNullable<
		Parameters<typeof ReactFlow>[0]["onNodeDrag"]
	> = useCallback(
		(_event, node) => {
			updateNodePosition(pipelineId, node.id, node.position);
		},
		[pipelineId, updateNodePosition],
	);

	const saveNodePosition: NonNullable<
		Parameters<typeof ReactFlow>[0]["onNodeDragStop"]
	> = useCallback(async (_event, node) => {
		if (node.type === NodeType.Trigger) {
			await updatePipelineTriggerAction({
				id: node.id,
				coords: {
					x: node.position.x,
					y: node.position.y,
				},
			});
		} else {
			await updatePipelineNodeAction({
				id: node.id,
				coords: {
					x: node.position.x,
					y: node.position.y,
				},
			});
		}
	}, []);

	const { getViewport } = useReactFlow();
	const viewportContainer = useRef<HTMLDivElement>(null);

	const getAdjustedCursorPosition = useCallback(
		(clientX: number, clientY: number) => {
			const rect = viewportContainer.current?.getBoundingClientRect();
			if (!rect) return { x: 0, y: 0 };

			const viewport = getViewport();
			const adjustedX = (clientX - rect.left - viewport.x) / viewport.zoom;
			const adjustedY = (clientY - rect.top - viewport.y) / viewport.zoom;

			return { x: adjustedX, y: adjustedY };
		},
		[getViewport],
	);

	const broadcastCursorPosition = useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
			const { x: adjustedX, y: adjustedY } = getAdjustedCursorPosition(
				event.clientX,
				event.clientY,
			);
			updateCursorPosition(pipelineId, {
				x: adjustedX,
				y: adjustedY,
			});
		},
		[getAdjustedCursorPosition, updateCursorPosition, pipelineId],
	);

	const preventContextMenu = useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
		},
		[],
	);

	const createPipelineNodeMutation = trpc.pipelineNode.create.useMutation();

	return (
		<ContextMenu
			onOpenChange={(open) => {
				if (!open) {
					setContextMenuPosition(null);
				}
			}}
		>
			<ContextMenuTrigger
				onContextMenu={(event) => {
					const { x, y } = getAdjustedCursorPosition(
						event.clientX,
						event.clientY,
					);

					setContextMenuPosition({ x: Math.round(x), y: Math.round(y) });
				}}
			>
				<div
					ref={viewportContainer}
					className="relative h-full w-full border border-primary/10 rounded-lg bg-card/80 backdrop-blur-sm"
				>
					<ReactFlow
						onMouseMove={broadcastCursorPosition}
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeDragStop={saveNodePosition}
						onNodeDrag={broadcastNodePosition}
						nodeTypes={nodeTypes}
						fitView
						proOptions={{
							hideAttribution: true,
						}}
					>
						<Panel position="top-left" onContextMenu={preventContextMenu}>
							<Button
								variant="outline"
								className="border-primary/10 hover:border-primary bg-card hover:bg-card"
								onClick={() => router.back()}
							>
								<ArrowBigLeftIcon className="mr-2 h-4 w-4" />
								Back
							</Button>
						</Panel>

						<Panel
							position="top-center"
							className="flex items-center justify-center bg-card/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-primary/10"
							onContextMenu={preventContextMenu}
						>
							<h2 className="text-sm font-bold text-primary">Participants</h2>

							<ul className="list-disc text-xs pl-5 text-muted-foreground">
								{Object.entries(participants).map(
									([id, { username, cursorPosition }]) => (
										<li key={id} className="py-1">
											{username}

											{cursorPosition && (
												<span className="text-xs text-muted-foreground/70 ml-2">
													({cursorPosition.x}, {cursorPosition.y})
												</span>
											)}
										</li>
									),
								)}
							</ul>
						</Panel>

						<Panel position="top-right" onContextMenu={preventContextMenu}>
							<Button size="icon">
								<TriangleIcon className="size-6 rotate-90 fill-background -mr-0.5" />
							</Button>
						</Panel>

						<Background
							color="var(--color-primary)"
							variant={BackgroundVariant.Dots}
						/>
					</ReactFlow>

					{Object.entries(participants).map(
						([id, { username, cursorPosition }]) => {
							if (!cursorPosition) {
								return null;
							}

							const viewport = getViewport();

							return (
								<div
									key={id}
									className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2"
									style={{
										left: cursorPosition.x * viewport.zoom + viewport.x,
										top: cursorPosition.y * viewport.zoom + viewport.y,
									}}
								>
									<MousePointer2 className="text-primary" />
									<span className="username text-xs text-primary">
										{username}
									</span>
								</div>
							);
						},
					)}
				</div>
			</ContextMenuTrigger>

			<ContextMenuContent className="bg-card border-primary/10">
				<ContextMenuSub>
					<ContextMenuSubTrigger className="text-primary hover:bg-primary/10">
						<PlusIcon className="size-4 mr-2" />
						Add Node
					</ContextMenuSubTrigger>

					<ContextMenuSubContent className="bg-card border-primary/10">
						{props.availableNodes.map((node) => (
							<ContextMenuItem
								key={node.id}
								className="text-primary hover:bg-primary/10"
								onSelect={async () => {
									if (!contextMenuPosition) return;

									const pipelineNode =
										await createPipelineNodeMutation.mutateAsync({
											pipelineId,
											nodeId: node.id,
											nodeVersion: "v1",
											coords: contextMenuPosition,
										});

									setNodes((nodes) => {
										return [
											...nodes,
											{
												id: pipelineNode.id,
												position: pipelineNode.coords,
												type: NodeType.Task,
												data: {
													name: `${node.name}:${pipelineNode.nodeVersion}`,
													config: node.config,
													inputs: pipelineNode.inputs,
													outputs: pipelineNode.outputs,
												},
											},
										];
									});
								}}
							>
								{node.name}
							</ContextMenuItem>
						))}
					</ContextMenuSubContent>
				</ContextMenuSub>
			</ContextMenuContent>
		</ContextMenu>
	);
};
