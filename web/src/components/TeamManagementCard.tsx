import { Users, Mail, User } from "lucide-react";
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
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { useParams } from "@tanstack/react-router";
import { Route } from "~/routes/__root";

export function TeamManagementCard() {
  const { orgId } = useParams({ strict: false });
  const { session } = Route.useRouteContext();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const { data } = useSuspenseQuery(
    trpc.orgs.listMembersAndInvites.queryOptions({
      organizationId: orgId!,
    })
  );

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
          {data && (data.members.length > 0 || data.invites.length > 0) ? (
            <div className="space-y-6">
              {/* Active Members */}
              {data.members.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Active Members ({data.members.length})
                  </h3>
                  <div className="space-y-2">
                    {data.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {member.name || member.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session?.username === member.name || session?.username === member.email ? "You" : "Member"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Invites */}
              {data.invites.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Pending Invites ({data.invites.length})
                  </h3>
                  <div className="space-y-2">
                    {data.invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-orange-50/50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="size-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Mail className="size-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {invite.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Invited{" "}
                              {new Date(invite.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-orange-600 font-medium">
                          Pending
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <Mail className="size-12 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No team members yet
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Start building your team by sending email invitations.
                    Members will receive a magic link to join your organization.
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
          )}
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
