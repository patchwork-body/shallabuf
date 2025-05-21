import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
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
import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import { getStripe, stripeOptions } from "~/lib/stripe";

export const Route = createFileRoute("/_protected/orgs/$orgId/settings")({
  component: Settings,
});

function Settings() {
  const { orgId } = useParams({ strict: false });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");

  const orgQuery = useQuery({
    ...trpc.orgs.get.queryOptions({ id: orgId ?? "" }),
    enabled: !!orgId,
  });

  const updateOrgMutation = useMutation({
    ...trpc.orgs.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const deleteOrgMutation = useMutation({
    ...trpc.orgs.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgs"] });
      navigate({ to: "/orgs" });
    },
  });

  if (!orgId || orgQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (orgQuery.error) {
    return <div>Error: {orgQuery.error.message}</div>;
  }

  const handleUpdateOrg = () => {
    if (!orgId || !orgName.trim()) return;
    updateOrgMutation.mutate({ id: orgId, name: orgName });
  };

  const handleDeleteOrg = () => {
    if (!orgId) return;
    deleteOrgMutation.mutate({ id: orgId });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Organization Settings</h1>

      {/* Organization Name Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Name</CardTitle>
          <CardDescription>Update your organization's name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="orgName">Name</Label>
            <Input
              id="orgName"
              placeholder={orgQuery.data?.name}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUpdateOrg}
            disabled={updateOrgMutation.isPending || !orgName.trim()}
          >
            {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* Team Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your organization's team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* TODO: Implement team members list and management */}
            <p className="text-sm text-muted-foreground">
              Team management features coming soon
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" disabled>
            Invite Team Member
          </Button>
        </CardFooter>
      </Card>

      {/* Billing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Manage your billing settings and subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={getStripe()} options={stripeOptions}>
            <form>
              {/* <PaymentElement /> */}
              <button>Submit</button>
            </form>
          </Elements>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" disabled>
            Manage Subscription
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Organization</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your organization and remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteOrg}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteOrgMutation.isPending
                    ? "Deleting..."
                    : "Delete Organization"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
