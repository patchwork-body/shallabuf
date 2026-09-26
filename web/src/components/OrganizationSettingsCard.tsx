import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, FormEventHandler, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import {
  safeParse,
  object,
  string,
  minLength,
  maxLength,
  regex,
  pipe,
} from "valibot";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Building2, Save } from "lucide-react";
import { type Organization } from "~/lib/schemas";
import { orgsUpdateFn } from "~/server-functions/orgs";

// Enhanced validation schema for organization names
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

interface OrganizationSettingsCardProps {
  organization: Organization;
  orgId: string;
}

export function OrganizationSettingsCard({
  organization,
  orgId,
}: OrganizationSettingsCardProps) {
  const queryClient = useQueryClient();

  // Organization update mutation
  const updateOrgMutation = useMutation({
    mutationFn: orgsUpdateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      orgForm.reset();
    },
    onError: (error) => {
      console.error("Failed to update organization:", error.message);
    },
  });

  // TanStack Form for organization name with validation
  const orgForm = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onChange: ({ value }) => {
        const result = safeParse(orgUpdateSchema, value);
        if (!result.success) {
          return {
            fields: {
              name: result.issues.map((issue) => issue.message),
            },
          };
        }
        return null;
      },
      onSubmit: ({ value }) => {
        const result = safeParse(orgUpdateSchema, value);
        if (!result.success) {
          return result.issues.map((issue) => issue.message);
        }
        return null;
      },
    },
    onSubmit: async ({ value }) => {
      if (!orgId) return;
      try {
        await updateOrgMutation.mutateAsync({ data: { id: orgId, name: value.name } });
      } catch (err) {
        console.error(err);
      }
    },
  });

  // Initialize form with organization name when data loads
  useEffect(() => {
    if (organization?.name) {
      orgForm.setFieldValue("name", organization.name);
    }
  }, [organization?.name, orgForm]);

  const submitOrgForm: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      orgForm.handleSubmit();
    },
    [orgForm]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Settings
        </CardTitle>
        <CardDescription>
          Update your organization's basic information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitOrgForm} className="space-y-4">
          <orgForm.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value) return "Organization name is required";
                if (value.length < 2) return "Must be at least 2 characters";
                if (value.length > 50) return "Must not exceed 50 characters";
                if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
                  return "Can only contain letters, numbers, spaces, hyphens, and underscores";
                }
                return undefined;
              },
              onBlur: ({ value }) => {
                if (!value.trim()) return "Organization name cannot be empty";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Organization Name
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={field.name}
                    placeholder="Enter organization name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="flex-1"
                    disabled={updateOrgMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={
                      updateOrgMutation.isPending ||
                      !field.state.meta.isDirty ||
                      !orgForm.state.isValid
                    }
                    size="sm"
                  >
                    {updateOrgMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>

                {/* Real-time validation errors */}
                {field.state.meta.errors.length > 0 && (
                  <div className="space-y-1">
                    {field.state.meta.errors.map((error, i) => (
                      <div
                        key={i}
                        className="text-xs text-red-500 flex items-center gap-1"
                      >
                        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                        {error}
                      </div>
                    ))}
                  </div>
                )}

                {/* Success message */}
                {updateOrgMutation.isSuccess && !field.state.meta.isDirty && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-600 rounded-full"></div>
                    Organization name updated successfully
                  </div>
                )}

                {/* Error from mutation */}
                {updateOrgMutation.error && (
                  <div className="text-xs text-red-500 flex items-center gap-1">
                    <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                    {updateOrgMutation.error.message}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  This is your organization's display name. It can be changed at
                  any time.
                </p>
              </div>
            )}
          </orgForm.Field>
        </form>
      </CardContent>
    </Card>
  );
}
