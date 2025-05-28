import { useCallback, useState, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type Organization } from "~/lib/schemas";
import { orgsListFn } from "~/server-functions/orgs";

interface UseOrganizationSelectorOptions {
  onSelect?: (org: Organization) => void;
  onCreateSuccess?: (orgId: string) => void;
  defaultSearchQuery?: string;
}

export const useOrganizationSelector = (
  options: UseOrganizationSelectorOptions = {}
) => {
  const { orgId } = useParams({ strict: false });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hoveredOrg, setHoveredOrg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    options.defaultSearchQuery || ""
  );

  const orgsQuery = useSuspenseQuery({
    queryKey: ["orgs", "list"],
    queryFn: () => orgsListFn({ data: { cursor: null, limit: 10 } }),
  });

  const organizations = orgsQuery.data?.organizations ?? [];

  const selectedOrg = useMemo(
    () => organizations.find((org: Organization) => org.id === orgId),
    [organizations, orgId]
  );

  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;

    return organizations.filter((org: Organization) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [organizations, searchQuery]);

  const hasOrganizations = organizations.length > 0;
  const hasFilteredResults = filteredOrganizations.length > 0;

  const handleOrgSelect = useCallback(
    (org: Organization) => {
      if (options.onSelect) {
        options.onSelect(org);
      } else {
        navigate({ to: "/orgs/$orgId/apps", params: { orgId: org.id } });
      }
      setOpen(false);
      setSearchQuery(options.defaultSearchQuery || "");
      setHoveredOrg(null);
    },
    [navigate, options]
  );

  const handleCreateOrgSuccess = useCallback(
    (newOrgId: string) => {
      if (options.onCreateSuccess) {
        options.onCreateSuccess(newOrgId);
      } else {
        navigate({ to: "/orgs/$orgId/apps", params: { orgId: newOrgId } });
      }
      setOpen(false);
      setSearchQuery(options.defaultSearchQuery || "");
      setHoveredOrg(null);
    },
    [navigate, options]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchQuery(options.defaultSearchQuery || "");
        setHoveredOrg(null);
      }
    },
    [options.defaultSearchQuery]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleHoverOrg = useCallback((orgId: string) => {
    setHoveredOrg(orgId);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoveredOrg(null);
  }, []);

  const reset = useCallback(() => {
    setOpen(false);
    setSearchQuery(options.defaultSearchQuery || "");
    setHoveredOrg(null);
  }, [options.defaultSearchQuery]);

  const refetch = useCallback(() => {
    return orgsQuery.refetch();
  }, [orgsQuery]);

  return {
    // State
    open,
    hoveredOrg,
    searchQuery,

    // Data
    organizations,
    filteredOrganizations,
    selectedOrg,
    hasOrganizations,
    hasFilteredResults,

    // Query state
    isLoading: orgsQuery.isLoading,
    isError: orgsQuery.isError,
    error: orgsQuery.error,

    // Actions
    handleOrgSelect,
    handleCreateOrgSuccess,
    handleOpenChange,
    handleSearchChange,
    handleHoverOrg,
    handleHoverEnd,
    reset,
    refetch,

    // Setters for advanced usage
    setOpen,
    setSearchQuery,
    setHoveredOrg,
  };
};
