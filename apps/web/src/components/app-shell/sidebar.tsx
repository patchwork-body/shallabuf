import { History, LibraryBig, TrendingUp, Waypoints } from "lucide-react";
import { NavLink } from "./nav-link";

export const Sidebar = () => {
  return (
    <aside className="fixed top-0 left-0 flex flex-col h-screen w-[var(--sidebar-width)] p-4 pt-[calc(var(--header-height)+1rem)] overflow-auto">
      <nav className="space-y-2">
        <li>
          <NavLink href="/decks">
            <LibraryBig />
            Decks
          </NavLink>
        </li>

        <li>
          <NavLink href="/shared">
            <Waypoints />
            Shared
          </NavLink>
        </li>

        <li>
          <NavLink href="/trend">
            <TrendingUp />
            Trend
          </NavLink>
        </li>

        <li>
          <NavLink href="/history">
            <History />
            History
          </NavLink>
        </li>
      </nav>
    </aside>
  );
};
