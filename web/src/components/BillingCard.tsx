import { CreditCard } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface BillingCardProps {
  orgId: string;
}

export function BillingCard({ orgId }: BillingCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-purple-600" />
          <CardTitle>Billing & Subscription</CardTitle>
        </div>
        <CardDescription>
          Manage your billing settings, payment methods, and subscription plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1">
            <p className="text-sm font-medium">Current Plan</p>
            <p className="text-xs text-muted-foreground">
              Manage your subscription and billing preferences
            </p>
          </div>
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/10">
            Active
          </span>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50">
        <Button variant="secondary" asChild className="w-full sm:w-auto">
          <Link
            to="/orgs/$orgId/settings/billing"
            params={{ orgId }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Billing
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 