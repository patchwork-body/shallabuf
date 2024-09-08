import { Button } from "@shallabuf/ui/button";
import { Input } from "@shallabuf/ui/input";
import { Bell, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { UserPanel } from "./user-panel";
import { ActionButton } from "./action-button";
import { Header } from "./header";
import { Logo } from "./logo";
import { Sidebar } from "./sidebar";

export type AppShellProps = {
  children: ReactNode;
};

export const AppShell = async ({ children }: AppShellProps) => {
  return (
    <div className="flex h-screen w-screen">
      <Header>
        <Link href="/" className="inline-flex items-center gap-x-2">
          <Logo />
          <h1>Shallabuf</h1>
        </Link>

        <div className="relative w-1/4 mx-auto">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />

          <Input
            type="search"
            placeholder="Search"
            className="p-2 pl-10 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-x-4">
          <ActionButton />

          <Button size="icon" variant="secondary" aria-label="Notifications">
            <Bell />
          </Button>

          <UserPanel />
        </div>
      </Header>

      <Sidebar />

      <main className="flex-1 mt-[calc(var(--header-height)+1rem)] ml-[calc(var(--sidebar-width)+1rem)] mr-[1rem]">
        {children}
      </main>
    </div>
  );
};
