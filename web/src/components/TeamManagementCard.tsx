import { Users, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { InviteMemberDialog } from "./InviteMemberDialog";

export function TeamManagementCard() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="size-5 text-primary" />
            <CardTitle>Team Management</CardTitle>
          </div>
          <CardDescription>
            Invite and manage team members for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <Mail className="size-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  No team members yet
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Start building your team by sending email invitations. Members
                  will receive a magic link to join your organization.
                </p>
              </div>
              <Button
                onClick={() => setIsInviteDialogOpen(true)}
                className="mt-4"
              >
                <Mail className="mr-2 size-4" />
                Send Your First Invitation
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button
            variant="secondary"
            onClick={() => setIsInviteDialogOpen(true)}
            className="w-full sm:w-auto ml-auto"
          >
            <Users className="mr-2 size-4" />
            Invite Team Member
          </Button>
        </CardFooter>
      </Card>

      <InviteMemberDialog
        isOpen={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />
    </>
  );
}
