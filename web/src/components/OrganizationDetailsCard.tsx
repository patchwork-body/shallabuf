import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, Save, Loader2 } from "lucide-react";
import { useCallback, FormEventHandler, useState } from "react";
import {
  safeParse,
  object,
  string,
  minLength,
  maxLength,
  regex,
  pipe,
} from "valibot";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ListOrganizationsResponse, Organization } from "~/lib/schemas";
import { orgsGetFn, orgsUpdateFn } from "~/server-functions/orgs";

const orgUpdateSchema = object({
  name: pipe(
    string(),
    minLength(2, "Organization name must be at least 2 characters"),
    maxLength(50, "Organization name must not exceed 50 characters"),
    regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Organization name can only contain letters, numbers, spaces, hyphens, and underscores"
    )
  ),
});

interface OrganizationDetailsCardProps {
  orgId: string;
}

export function OrganizationDetailsCard({
  orgId,
}: OrganizationDetailsCardProps) {
  const { data: organization } = useSuspenseQuery({
    queryKey: ["orgs", "get", orgId],
    queryFn: () => orgsGetFn({ data: { id: orgId } }),
  });
  const queryClient = useQueryClient();

  const updateOrgMutation = useMutation({
    mutationFn: orgsUpdateFn,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: ["orgs", "get", orgId],
      });

      queryClient.setQueriesData({
        queryKey: ["orgs", "list"],
      }, (old: ListOrganizationsResponse) => {
        return { ...old, organizations: old.organizations.map((org: Organization) => {
          if (org.id === orgId) {
            return {
              ...org,
              name: data.name,
            }
          }

          return org;
        })}
      })

      form.reset({
        name: data.name,
      });
    },
    onError: (error) => {
      console.error("Failed to update organization:", error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: organization.name,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = safeParse(orgUpdateSchema, value);

        if (!result.success) {
          return result.issues.map((issue) => issue.message);
        }

        return null;
      },
    },
    onSubmit: async ({ value }) => {
      try {
        await updateOrgMutation.mutateAsync({
          data: {
            id: orgId,
            name: value.name,
          },
        });
      } catch (err) {
        console.error(err);
      }
    },
  });

  const newOrgName = useStore(form.store, (state) => state.values.name);

  const submit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      form.handleSubmit();
    },
    [form.handleSubmit]
  );

  const hasUnsavedChanges = form.state.isDirty && newOrgName.trim() !== "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <CardTitle>Organization Details</CardTitle>
        </div>
        <CardDescription>
          Update your organization's basic information and settings.
        </CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-6">
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Organization Name
                </Label>
                <Input
                  id={field.name}
                  placeholder="Enter organization name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="max-w-md"
                  disabled={updateOrgMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  This is your organization's display name. It can be changed at
                  any time.
                </p>
                {!field.state.meta.isValid &&
                  field.state.meta.errors.length > 0 && (
                    <div className="text-xs text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
              </div>
            )}
          </form.Field>
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {hasUnsavedChanges && (
                <>
                  <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                  <span>You have unsaved changes</span>
                </>
              )}
            </div>
            <Button
              type="submit"
              disabled={
                !hasUnsavedChanges ||
                !form.state.isValid ||
                updateOrgMutation.isPending
              }
              className="min-w-[120px]"
            >
              {updateOrgMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
