import type { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export type AppShellProps = {
  children: ReactNode;
};

export const AppShell = async ({ children }: AppShellProps) => {
  return (
    <div className="flex h-screen w-screen">
      <Header />
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
};
