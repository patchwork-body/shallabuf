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
import { createOrganizationSchema } from "~/lib/schemas";
import { safeParse } from "valibot";

interface CreateOrganizationDialogProps {
  onSuccess?: (orgId: string) => void;
  children?: React.ReactNode;
}

export function CreateOrganizationDialog({
  onSuccess,
  children,
}: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createOrgMutation = useMutation({
    ...trpc.orgs.create.mutationOptions(),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries(trpc.orgs.list.queryOptions({}));
      setOpen(false);
      onSuccess?.(id);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = safeParse(createOrganizationSchema, value);

        if (!result.success) {
          return result.issues.map((issue) => issue.message);
        }

        return null;
      },
    },
    onSubmit: async ({ value }) => {
      try {
        await createOrgMutation.mutateAsync(value);
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
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to manage your apps.
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
                  placeholder="My Organization"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  disabled={createOrgMutation.isPending}
                />
                {!field.state.meta.isValid && (
                  <div className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </div>
                )}
              </div>
            )}
          </form.Field>
          {createOrgMutation.error && (
            <div className="text-sm text-destructive dark:text-destructive/90 text-center">
              {createOrgMutation.error.message}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createOrgMutation.isPending}>
              {createOrgMutation.isPending
                ? "Creating..."
                : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
