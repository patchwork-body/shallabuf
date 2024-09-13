"use client";
import { cn } from "@shallabuf/ui/cn";
import { type ReactNode, useEffect, useState } from "react";

export type HeaderProps = {
  children: ReactNode;
};

export const Header = ({ children }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-screen h-[var(--header-height)] px-4 py-6 flex items-center z-20 bg-background",
      )}
    >
      {children}
    </header>
  );
};
