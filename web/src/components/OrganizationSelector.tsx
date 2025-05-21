import { useCallback, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { useParams, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";
import { OrgsAppsMiniList } from "./OrgsAppsMiniList";
import { Separator } from "./ui/separator";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";

export const OrganizationSelector = () => {
  const { orgId } = useParams({ strict: false });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hoveredOrg, setHoveredOrg] = useState<string | null>(null);
  const orgsQuery = useSuspenseQuery(
    trpc.orgs.list.queryOptions({})
  );

  const organizations = orgsQuery.data?.organizations ?? [];
  const selectedOrg = organizations.find(
    (org: Organization) => org.id === orgId
  );

  const handleOrgSelect = useCallback(
    (org: Organization) => {
      navigate({ to: "/orgs/$orgId", params: { orgId: org.id } });
      setOpen(false);
    },
    [navigate, setOpen]
  );

  const handleCreateOrgSuccess = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  if (organizations.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {selectedOrg?.name ?? "Select Organization"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] sm:w-[500px]" align="start">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandEmpty>No organization found.</CommandEmpty>

          <div className="flex">
            <CommandGroup className="w-[300px] border-r mt-2 pr-4">
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  onSelect={() => handleOrgSelect(org)}
                  onMouseEnter={() => setHoveredOrg(org.id)}
                  onMouseLeave={() => setHoveredOrg(null)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedOrg?.id === org.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {org.name}
                </CommandItem>
              ))}

              <Separator className="my-2" />

              <CommandItem className="cursor-pointer" asChild>
                <CreateOrganizationDialog onSuccess={handleCreateOrgSuccess}>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                  </Button>
                </CreateOrganizationDialog>
              </CommandItem>
            </CommandGroup>

            <div className="hidden sm:block w-[200px] p-2">
              {hoveredOrg && (
                <div className="space-y-2">
                  <OrgsAppsMiniList organizationId={hoveredOrg} />
                </div>
              )}
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
