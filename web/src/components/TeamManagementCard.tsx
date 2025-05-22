import { Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function TeamManagementCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-green-600" />
          <CardTitle>Team Management</CardTitle>
        </div>
        <CardDescription>
          Invite and manage team members for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-center space-y-2">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Team management features coming soon
            </p>
            <p className="text-xs text-muted-foreground">
              Invite team members, manage roles, and collaborate effectively.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50">
        <Button variant="secondary" disabled className="w-full sm:w-auto">
          <Users className="mr-2 h-4 w-4" />
          Invite Team Member
        </Button>
      </CardFooter>
    </Card>
  );
} 