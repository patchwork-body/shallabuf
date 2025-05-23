import { Mail, Plus, X, Send, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useInviteMembers } from "~/hooks/useInviteMembers";

interface InviteMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({
  isOpen,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { form, isSubmitting, addEmailField, removeEmailField } =
    useInviteMembers(() => {
      onOpenChange(false);
    });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Invite Team Members
          </DialogTitle>
          <DialogDescription>
            Send email invitations to add new members to your organization.
            They'll receive a magic link to join.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-4">
            <Label htmlFor="emails" className="text-sm font-medium">
              Email Addresses
            </Label>

            <form.Field name="emails">
              {(field) => (
                <div className="space-y-3">
                  {field.state.value.map((email, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder={
                            index === 0
                              ? "Enter email address"
                              : "Add another email..."
                          }
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...field.state.value];
                            newEmails[index] = e.target.value;
                            field.handleChange(newEmails);
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              e.currentTarget.value.trim() &&
                              index === field.state.value.length - 1
                            ) {
                              e.preventDefault();
                              addEmailField();
                            }
                          }}
                          className={`w-full ${email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "border-destructive" : ""}`}
                          disabled={isSubmitting}
                        />
                        {email.trim() &&
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                            <p className="text-xs text-destructive mt-1">
                              Please enter a valid email address
                            </p>
                          )}
                      </div>

                      {field.state.value.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEmailField(index)}
                          disabled={isSubmitting}
                          className="shrink-0 mt-0"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {form.getFieldValue("emails").length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                disabled={isSubmitting}
                className="w-full"
              >
                <Plus className="size-4 mr-2" />
                Add Another Email
              </Button>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <form.Subscribe>
              {() => (
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    form.getFieldValue("emails").every((email) => !email.trim())
                  }
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Send Invitations
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
