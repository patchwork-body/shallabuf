import { OrganizationSettingsCard } from "./OrganizationSettingsCard";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { BillingHistoryCard } from "./BillingHistoryCard";
import { SubscriptionCard } from "./SubscriptionCard";
import { type Organization } from "~/lib/schemas";

interface BillingManagementViewProps {
  organization: Organization;
  orgId: string;
}

export function BillingManagementView({ 
  organization, 
  orgId 
}: BillingManagementViewProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Billing Management</h1>
        <p className="text-muted-foreground">
          Manage your organization's billing settings and payment methods.
        </p>
      </div>

      <div className="grid gap-4">
        <OrganizationSettingsCard 
          organization={organization} 
          orgId={orgId} 
        />
        <PaymentMethodCard />
        <BillingHistoryCard />
        <SubscriptionCard />
      </div>
    </div>
  );
} 