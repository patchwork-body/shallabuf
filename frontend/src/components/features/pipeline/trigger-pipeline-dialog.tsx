"use client";
import { ClockIcon, Loader, PlayIcon } from "lucide-react";
import { type ReactNode, memo, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { triggerPipelineAction } from "~/actions/trigger-pipeline";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Form, FormField } from "~/components/ui/form";
import type { ExecStatus } from "~/lib/dtos";

export interface TriggerPipelineDialogProps {
	pipelineId: string;
	execStatus?: ExecStatus;
}

type TriggerPipelineFormData = {
	pipelineId: string;
	inputs: Record<string, Record<string, string>>;
};

const STATUS_ICONS: Record<ExecStatus, ReactNode> = {
	pending: <ClockIcon />,
	running: <Loader />,
	completed: <PlayIcon />,
	failed: <PlayIcon />,
	cancelled: <PlayIcon />,
} as const;

const _getStatusIcon = (status?: ExecStatus) => {
	if (!status) return <PlayIcon />;
	return STATUS_ICONS[status] ?? <PlayIcon />;
};

export const TriggerPipelineDialog = memo(
	({ pipelineId, execStatus }: TriggerPipelineDialogProps) => {
		const defaultValues = {
			pipelineId,
		};

		const form = useForm<TriggerPipelineFormData>({
			defaultValues,
		});

		const [open, setOpen] = useState(false);

		const submit = useCallback(async (values: TriggerPipelineFormData) => {
			setOpen(false);
			const formData = new FormData();

			formData.append("pipelineId", values.pipelineId);
			// formData.append("inputs", JSON.stringify(values.inputs));

			await triggerPipelineAction(formData);
		}, []);

		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button className="flex items-center justify-center w-full">
						{execStatus === "pending" && <ClockIcon />}
						{execStatus === "running" && <Loader />}
						{["completed", "failed"].includes(execStatus ?? "completed") && (
							<PlayIcon />
						)}
					</Button>
				</DialogTrigger>

				<DialogContent>
					<DialogHeader>
						<DialogTitle>Trigger pipeline</DialogTitle>
						<DialogDescription>
							This action will trigger this pipeline. Please fill out the form
							below.
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form
							className="flex flex-col gap-4"
							onSubmit={form.handleSubmit(submit)}
						>
							<FormField
								name="pipelineId"
								control={form.control}
								render={({ field }) => <input type="hidden" {...field} />}
							/>

							{/* {connectedNodesData.map(({ id, data }) => (
								<fieldset key={id}>
									{data.config?.inputs.map(({ key, label, input }) => (
										<FormField
											key={key}
											name={`inputs.${id}.${key}`}
											control={form.control}
											render={({ field }) => (
												<NodeInput
													label={label.en}
													input={input}
													value={field.value}
													onChange={field.onChange}
												/>
											)}
										/>
									))}
								</fieldset>
							))} */}

							<Button className="ml-auto" type="submit">
								{form.formState.isSubmitting ? <Loader /> : null}
								Trigger Pipeline
							</Button>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		);
	},
);

TriggerPipelineDialog.displayName = "TriggerPipelineDialog";
