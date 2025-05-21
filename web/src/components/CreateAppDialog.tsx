import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { FormEventHandler, useCallback, useState } from "react";
import { trpc } from "~/trpc/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { PlusIcon } from "lucide-react";
import { CreateAppResponse, createAppSchema } from "~/lib/schemas";
import { safeParse } from "valibot";
import { useParams } from "@tanstack/react-router";

interface CreateAppDialogProps {
  onSuccess: (data: CreateAppResponse) => void;
}

export function CreateAppDialog({ onSuccess }: CreateAppDialogProps) {
  const { orgId } = useParams({ strict: false });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createAppMutation = useMutation({
    ...trpc.apps.create.mutationOptions(),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(
        trpc.apps.list.infiniteQueryOptions({
          organizationId: orgId ?? "",
          cursor: undefined,
          limit: 10,
        })
      );

      setOpen(false);
      onSuccess(data);
    },
  });

  const form = useForm({
    defaultValues: {
      organizationId: orgId ?? "",
      name: "",
      description: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = safeParse(createAppSchema, value);

        if (!result.success) {
          return result.issues.map((issue) => issue.message);
        }

        return null;
      },
    },
    onSubmit: async ({ value }) => {
      try {
        await createAppMutation.mutateAsync(value);
        form.reset();
      } catch (err) {
        console.error(err);
      }
    },
  });

  const submit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <PlusIcon className="w-4 h-4" />
          Create New App
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New App</DialogTitle>
          <DialogDescription>
            Create a new app to get started with Shallabuf.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <form.Field name="organizationId">
            {(field) => (
              <Input type="hidden" value={field.state.value} />
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <div className="space-y-1">
                <Label
                  htmlFor={field.name}
                  className="block text-sm font-medium dark:text-white/90"
                >
                  Name
                </Label>
                <Input
                  id={field.name}
                  type="text"
                  placeholder="My Awesome App"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  disabled={createAppMutation.isPending}
                />
                {!field.state.meta.isValid && (
                  <div className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </div>
                )}
              </div>
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <div className="space-y-1">
                <Label
                  htmlFor={field.name}
                  className="block text-sm font-medium dark:text-white/90"
                >
                  Description
                </Label>
                <Input
                  id={field.name}
                  type="text"
                  placeholder="A brief description of your app"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={createAppMutation.isPending}
                />
                {!field.state.meta.isValid && (
                  <div className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </div>
                )}
              </div>
            )}
          </form.Field>
          {createAppMutation.error && (
            <div className="text-sm text-destructive dark:text-destructive/90 text-center">
              {createAppMutation.error.message}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createAppMutation.isPending}>
              {createAppMutation.isPending ? "Creating..." : "Create App"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
