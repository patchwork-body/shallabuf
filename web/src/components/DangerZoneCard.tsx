import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { trpc } from "~/trpc/client";

interface DangerZoneCardProps {
  orgId: string;
  orgName: string;
}

export function DangerZoneCard({ orgId, orgName }: DangerZoneCardProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const deleteOrgMutation = useMutation({
    ...trpc.orgs.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      navigate({ to: "/orgs" });
    },
    onError: (error) => {
      console.error("Failed to delete organization:", error.message);
      setIsDeleteDialogOpen(false);
    },
  });

  const handleDeleteOrg = useCallback(() => {
    deleteOrgMutation.mutate({ id: orgId });
  }, [deleteOrgMutation.mutate, orgId]);

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </div>
        <CardDescription className="text-destructive/80">
          Irreversible and destructive actions. Please proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 border border-destructive/20 rounded-lg bg-card">
            <h4 className="font-medium text-destructive mb-2">Delete Organization</h4>
            <p className="text-sm text-destructive/80 mb-4">
              Once you delete an organization, there is no going back. This will permanently
              delete the organization and all of its data.
            </p>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>Delete Organization</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Are you absolutely sure you want to delete{" "}
                      <strong>"{orgName}"</strong>?
                    </p>
                    <p className="text-destructive font-medium">
                      This action cannot be undone. This will permanently delete your
                      organization and remove all associated data including:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                      <li>All organization data and settings</li>
                      <li>Team member access and permissions</li>
                      <li>Billing history and subscriptions</li>
                      <li>Any associated projects or resources</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteOrgMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteOrg}
                    disabled={deleteOrgMutation.isPending}
                    className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
                  >
                    {deleteOrgMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Organization
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 