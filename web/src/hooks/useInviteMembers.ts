import { useForm } from "@tanstack/react-form";
import * as v from "valibot";
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { orgsInviteMembersFn } from "~/server-functions/orgs";

const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.email("Please enter a valid email address")
);

const InviteFormSchema = v.object({
  emails: v.pipe(
    v.array(EmailSchema),
    v.minLength(1, "At least one email is required"),
    v.maxLength(10, "Maximum 10 emails allowed")
  ),
});

export type InviteFormData = v.InferInput<typeof InviteFormSchema>;

export function useInviteMembers(onSuccess?: () => void) {
  const { orgId } = useParams({ strict: false });
  const queryClient = useQueryClient();
  const inviteMembersMutation = useMutation({
    mutationFn: orgsInviteMembersFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["orgs", "listMembersAndInvites", orgId],
      });

      onSuccess?.();
    },
  });

  const inviteMembers = useCallback(async (emails: string[]) => {
    if (!orgId) {
      return;
    }

    try {
      await inviteMembersMutation.mutateAsync({
        data: {
          emails,
          organizationId: orgId,
        },
      });
    } catch (error) {
      console.error("Failed to send invitations:", error);
      throw new Error("Failed to send invitations");
    }
  }, [inviteMembersMutation, orgId]);

  const form = useForm({
    defaultValues: {
      emails: [""],
    },
    onSubmit: async ({ value }) => {
      try {
        const validEmails = value.emails.filter((email) => email.trim() !== "");

        const validatedData = v.parse(InviteFormSchema, {
          emails: validEmails,
        });

        await inviteMembers(validatedData.emails);

        form.reset();
        onSuccess?.();
      } catch (error) {
        console.error("Form submission error:", error);
      }
    },
  });

  const addEmailField = () => {
    const currentEmails = form.getFieldValue("emails");
    if (currentEmails.length < 10) {
      form.setFieldValue("emails", [...currentEmails, ""]);
    }
  };

  const removeEmailField = (index: number) => {
    const currentEmails = form.getFieldValue("emails");
    if (currentEmails.length > 1) {
      const newEmails = currentEmails.filter((_, i) => i !== index);
      form.setFieldValue("emails", newEmails);
    }
  };

  return {
    form,
    addEmailField,
    removeEmailField,
  };
}
