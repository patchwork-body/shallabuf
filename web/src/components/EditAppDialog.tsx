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
import { editAppSchema, type AppInfo } from "~/lib/schemas";
import { PencilIcon } from "lucide-react";
import { safeParse } from "valibot";
import { useParams } from "@tanstack/react-router";

interface EditAppDialogProps {
  app: AppInfo;
}

export function EditAppDialog({ app }: EditAppDialogProps) {
  const { orgId } = useParams({ strict: false });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const editAppMutation = useMutation({
    ...trpc.apps.edit.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        trpc.apps.list.infiniteQueryOptions({
          organizationId: orgId ?? "",
          cursor: undefined,
          limit: 10,
        })
      );
      setOpen(false);
    },
  });

  const form = useForm({
    defaultValues: {
      name: app.name,
      description: app.description ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = safeParse(editAppSchema, {
          appId: app.appId,
          ...value,
        });

        if (!result.success) {
          console.error(result.issues);
          return;
        }

        await editAppMutation.mutateAsync(result.output);
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
        <Button variant="outline" size="icon" className="min-w-full">
          <PencilIcon className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit App</DialogTitle>
          <DialogDescription>
            Edit your app's name and description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
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
                  // disabled={editAppMutation.isPending}
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
                  // disabled={editAppMutation.isPending}
                />
                {!field.state.meta.isValid && (
                  <div className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </div>
                )}
              </div>
            )}
          </form.Field>
          {editAppMutation.error && (
            <div className="text-sm text-destructive dark:text-destructive/90 text-center">
              {editAppMutation.error.message}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={editAppMutation.isPending}>
              {editAppMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
