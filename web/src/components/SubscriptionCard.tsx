import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function SubscriptionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Manage your subscription plan and usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Current Plan
            </span>
            <span className="text-sm font-medium">Pro</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Next Billing Date
            </span>
            <span className="text-sm font-medium">Next month</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            Change Plan
          </Button>
          <Button variant="outline" className="flex-1">
            Cancel Subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 