import { useForm } from "@tanstack/react-form";
import * as v from "valibot";
import { useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inviteMembers = async (emails: string[]) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Invitations sent to:", emails);
      return { success: true, invitedEmails: emails };
    } catch (error) {
      console.error("Failed to send invitations:", error);
      throw new Error("Failed to send invitations");
    } finally {
      setIsSubmitting(false);
    }
  };

  const form = useForm({
    defaultValues: {
      emails: [""] as string[],
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
    isSubmitting,
    addEmailField,
    removeEmailField,
  };
}
