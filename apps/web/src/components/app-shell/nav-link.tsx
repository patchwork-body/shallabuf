"use client";

import { logger } from "@shallabuf/logger";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavLinkProps = {
  href: string;
  children: ReactNode;
};

export const NavLink = ({ href, children }: NavLinkProps) => {
  const pathname = usePathname();

  return (
    <Link
      data-active={pathname === href}
      href={href}
      className="data-[active=true]:bg-secondary inline-flex min-w-full items-center gap-x-2 px-3 py-2 rounded-lg"
    >
      {children}
    </Link>
  );
};
