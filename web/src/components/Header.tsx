import { Button } from "./ui/button";
import { trpc } from "~/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useNavigate,
  useParams,
  Link,
  useMatchRoute,
} from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Route } from "~/routes/__root";
import { OrganizationSelector } from "./OrganizationSelector";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { cn } from "~/lib/utils";

interface NavLinkProps {
  to: string;
  params?: Record<string, string>;
  children: React.ReactNode;
}

const NavLink = ({ to, params, children }: NavLinkProps) => {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to, params });

  return (
    <NavigationMenuLink
      asChild
      className={cn(
        navigationMenuTriggerStyle(),
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <Link to={to} params={params}>
        {children}
      </Link>
    </NavigationMenuLink>
  );
};

export const Header = () => {
  const { session } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { orgId } = useParams({ strict: false });

  const logoutMutation = useMutation({
    ...trpc.auth.logout.mutationOptions(),
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: "/login" });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <header className="sticky top-0 z-30 w-full border-b shadow-sm px-6 py-4 flex items-center justify-between backdrop-blur">
      <span className="flex items-center gap-6">
        <Logo className="size-6" />
        <span className="font-medium">Shallabuf</span>
        {session && orgId && (
          <>
            <OrganizationSelector />
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavLink
                    to="/orgs/$orgId/apps"
                    params={{ orgId: orgId ?? "" }}
                  >
                    Apps
                  </NavLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavLink
                    to="/orgs/$orgId/settings"
                    params={{ orgId: orgId ?? "" }}
                  >
                    Settings
                  </NavLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </>
        )}
      </span>

      {session && (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      )}
    </header>
  );
};
