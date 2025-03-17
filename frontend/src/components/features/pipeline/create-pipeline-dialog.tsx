"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormFieldMessage,
	FormItem,
	FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { createPipelineSchema } from "~/lib/schemas";
import { trpc } from "~/trpc/client";

export interface CreatePipelineDialogProps {
	teamId: string;
}

type FormValues = z.infer<typeof createPipelineSchema>;

export const CreatePipelineDialog = memo(
	({ teamId }: CreatePipelineDialogProps) => {
		const router = useRouter();
		const form = useForm<FormValues>({
			resolver: zodResolver(createPipelineSchema),
			defaultValues: {
				teamId,
				name: "",
				description: "",
			},
		});

		const [open, setOpen] = useState(false);

		const createPipelineMutation = trpc.pipeline.create.useMutation({
			onSuccess: async (...args) => {
				setOpen(false);
				router.refresh();
			},
		});

		const submit = useCallback(
			async (formData: FormValues) => {
				console.log(formData);

				await createPipelineMutation.mutateAsync({
					teamId: formData.teamId,
					name: formData.name,
					description: formData.description,
				});
			},
			[createPipelineMutation.mutateAsync],
		);

		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button variant="default">Create</Button>
				</DialogTrigger>

				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create new pipeline</DialogTitle>
						<DialogDescription>
							This action will create a new pipeline. Please fill out the form
							below.
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form
							className="flex flex-col items-center gap-4"
							onSubmit={form.handleSubmit(submit)}
						>
							<FormField
								name="teamId"
								control={form.control}
								render={({ field }) => <input type="hidden" {...field} />}
							/>

							<FormField
								name="name"
								control={form.control}
								render={({ field }) => (
									<FormItem className="min-w-full">
										<FormLabel>Name</FormLabel>

										<FormControl>
											<Input placeholder="Pipeline name" {...field} />
										</FormControl>

										<FormFieldMessage />
									</FormItem>
								)}
							/>

							<FormField
								name="description"
								control={form.control}
								render={({ field }) => (
									<FormItem className="min-w-full">
										<FormLabel>Description</FormLabel>

										<FormControl>
											<Textarea
												placeholder="Pipeline description"
												className="resize-none"
												{...field}
											/>
										</FormControl>

										<FormFieldMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								className="ml-auto"
								disabled={createPipelineMutation.isPending}
							>
								{createPipelineMutation.isPending ? "Creating..." : "Create"}
							</Button>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		);
	},
);

CreatePipelineDialog.displayName = "CreatePipelineDialog";
