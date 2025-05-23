import { useRef, useEffect, memo } from "react";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import { cn } from "~/lib/utils";
import { type Organization } from "~/lib/schemas";
import { OrgsAppsMiniList } from "./OrgsAppsMiniList";
import { Separator } from "./ui/separator";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { useOrganizationSelector } from "~/hooks";

interface OrganizationSelectorProps {
  className?: string;
  variant?: "default" | "compact";
  onSelect?: (org: Organization) => void;
  onCreateSuccess?: (orgId: string) => void;
}

const OrganizationItem = memo(
  ({
    org,
    isSelected,
    onSelect,
    onHover,
    onHoverEnd,
  }: {
    org: Organization;
    isSelected: boolean;
    onSelect: () => void;
    onHover: () => void;
    onHoverEnd: () => void;
  }) => (
    <CommandItem
      key={org.id}
      onSelect={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:bg-accent/50 hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        "group relative",
        isSelected && "bg-accent/30"
      )}
      role="option"
      aria-selected={isSelected}
      aria-describedby={`org-${org.id}-description`}
    >
      <div className="flex items-center space-x-3 w-full min-w-0">
        <Check
          className={cn(
            "h-4 w-4 shrink-0 transition-opacity duration-200",
            isSelected ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
        <Building2
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200",
            "group-hover:text-accent-foreground"
          )}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate" title={org.name}>
              {org.name}
            </span>
            {org.billingConnected && (
              <Badge
                variant="secondary"
                className="ml-2 text-xs shrink-0"
                aria-label="Billing connected"
              >
                Pro
              </Badge>
            )}
          </div>
          <div
            id={`org-${org.id}-description`}
            className="text-xs text-muted-foreground sr-only"
          >
            Organization: {org.name}
            {org.billingConnected ? " (Pro plan)" : " (Free plan)"}
          </div>
        </div>
      </div>
    </CommandItem>
  )
);

OrganizationItem.displayName = "OrganizationItem";

const OrganizationSelectorSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-10 w-full" />
  </div>
);

const OrganizationSelectorError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex items-center justify-center p-4 text-center">
    <div className="space-y-2">
      <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
      <p className="text-sm text-muted-foreground">
        Failed to load organizations
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="text-xs">
        Try again
      </Button>
    </div>
  </div>
);

export const OrganizationSelector = ({
  className,
  variant = "default",
  onSelect,
  onCreateSuccess,
}: OrganizationSelectorProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    open,
    hoveredOrg,
    searchQuery,
    filteredOrganizations,
    selectedOrg,
    hasOrganizations,
    isError,
    handleOrgSelect,
    handleCreateOrgSuccess,
    handleOpenChange,
    handleSearchChange,
    handleHoverOrg,
    handleHoverEnd,
    refetch,
  } = useOrganizationSelector({ onSelect, onCreateSuccess });

  useEffect(() => {
    if (open && contentRef.current) {
      const searchInput =
        contentRef.current.querySelector('input[type="text"]');

      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus();
      }
    }
  }, [open]);

  if (isError) {
    return <OrganizationSelectorError onRetry={refetch} />;
  }

  if (!hasOrganizations) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <CreateOrganizationDialog onSuccess={handleCreateOrgSuccess}>
          <Button
            variant="outline"
            size={variant === "compact" ? "sm" : "default"}
          >
            <Plus className="mr-2 size-4" />
            Create Organization
          </Button>
        </CreateOrganizationDialog>
      </div>
    );
  }

  const isCompact = variant === "compact";
  const triggerText = selectedOrg?.name ?? "Select Organization";

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={
              selectedOrg
                ? `Selected organization: ${selectedOrg.name}`
                : "Select organization"
            }
            className={cn(
              "justify-between transition-all duration-200",
              "hover:bg-accent/50 focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isCompact ? "h-8 px-2 text-sm" : "min-w-[200px]",
              open && "ring-2 ring-ring ring-offset-2"
            )}
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Building2
                className={cn("shrink-0", isCompact ? "size-3" : "size-4")}
                aria-hidden="true"
              />
              <span className="truncate" title={triggerText}>
                {triggerText}
              </span>
              {selectedOrg?.billingConnected && !isCompact && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Pro
                </Badge>
              )}
            </div>
            <ChevronsUpDown
              className={cn(
                "ml-2 shrink-0 opacity-50 transition-transform duration-200",
                isCompact ? "size-3" : "size-4",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          ref={contentRef}
          className={cn(
            "p-0 shadow-lg border-0 bg-popover/95 backdrop-blur-sm",
            isCompact ? "w-[280px]" : "w-[300px] sm:w-[500px]"
          )}
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <CommandInput
                placeholder="Search organizations..."
                value={searchQuery}
                onValueChange={handleSearchChange}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
                aria-label="Search organizations"
              />
            </div>

            <div className={cn("flex", isCompact ? "flex-col" : "flex-row")}>
              <div
                className={cn(
                  "border-r",
                  isCompact ? "w-full border-r-0 border-b" : "w-[300px]"
                )}
              >
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery.trim()
                    ? `No organizations found for "${searchQuery}"`
                    : "No organizations found."}
                </CommandEmpty>

                <CommandGroup className="mt-2 px-2 pb-2">
                  <div
                    role="listbox"
                    aria-label="Organizations"
                    className="space-y-1"
                  >
                    {filteredOrganizations.map((org) => (
                      <OrganizationItem
                        key={org.id}
                        org={org}
                        isSelected={selectedOrg?.id === org.id}
                        onSelect={() => handleOrgSelect(org)}
                        onHover={() => handleHoverOrg(org.id)}
                        onHoverEnd={handleHoverEnd}
                      />
                    ))}
                  </div>

                  <Separator className="my-3" />

                  <CreateOrganizationDialog onSuccess={handleCreateOrgSuccess}>
                    <Button
                      className="w-full justify-start transition-all duration-200 hover:shadow-sm"
                      variant="ghost"
                      size="sm"
                    >
                      <Plus className="mr-2 size-4" />
                      Create Organization
                    </Button>
                  </CreateOrganizationDialog>
                </CommandGroup>
              </div>

              {!isCompact && (
                <div className="w-[200px] p-3">
                  {hoveredOrg ? (
                    <div className="space-y-3">
                      <div className="pb-2 border-b">
                        <h4 className="text-sm font-medium text-foreground">
                          Quick Preview
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Recent apps in this organization
                        </p>
                      </div>
                      <OrgsAppsMiniList organizationId={hoveredOrg} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 text-center">
                      <div className="space-y-2">
                        <ArrowUpDown className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                        <p className="text-xs text-muted-foreground">
                          Hover over an organization to see recent apps
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { OrganizationSelectorSkeleton, OrganizationSelectorError };
