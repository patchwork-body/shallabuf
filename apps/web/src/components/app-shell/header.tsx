import { Input } from "@shallabuf/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { UserPanel } from "../user-panel";
import { Logo } from "./logo";

export const Header = async () => {
  return (
    <header className="fixed top-0 left-0 w-screen h-[var(--header-height)] px-4 py-6 flex items-center z-10">
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

      <UserPanel />
    </header>
  );
};
