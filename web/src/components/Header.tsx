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
import { cn } from "~/lib/utils";
import { LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";

interface NavLinkProps {
  to: string;
  params?: Record<string, string>;
  children: React.ReactNode;
}

const NavLink = ({ to, params, children }: NavLinkProps) => {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to, params });

  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "relative px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-md hover:bg-accent",
        isActive
          ? "text-foreground bg-accent"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
      )}
    </Link>
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
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary rounded-xl shadow-sm">
                  <Logo className="size-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground tracking-tight">
                  Shallabuf
                </span>
              </div>
            </div>

            {/* Navigation */}
            {session && orgId && (
              <div className="flex items-center space-x-6">
                <OrganizationSelector />
                <nav className="hidden md:flex items-center space-x-1">
                  <NavLink
                    to="/orgs/$orgId/apps"
                    params={{ orgId: orgId ?? "" }}
                  >
                    Apps
                  </NavLink>
                  <NavLink
                    to="/orgs/$orgId/settings"
                    params={{ orgId: orgId ?? "" }}
                  >
                    Settings
                  </NavLink>
                </nav>
              </div>
            )}
          </div>

          {/* Right side - User Actions */}
          {session && (
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Mobile Navigation Menu */}
              {orgId && (
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 hover:bg-accent"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/orgs/$orgId/apps"
                          params={{ orgId: orgId ?? "" }}
                          className="flex w-full"
                        >
                          Apps
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/orgs/$orgId/settings"
                          params={{ orgId: orgId ?? "" }}
                          className="flex w-full"
                        >
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 rounded-full bg-muted hover:bg-accent p-0 transition-all duration-200 hover:scale-105"
                  >
                    <div className="size-6 bg-primary rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground shadow-sm">
                      {session.id?.[0]?.toUpperCase() || "U"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">
                      User Account
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {session.id.slice(0, 8)}...
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 size-4" />
                    {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
