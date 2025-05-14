import * as React from "react";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { MoonIcon, SunIcon } from "lucide-react";

export interface ThemeToggleProps {
  theme: string;
  toggleTheme: () => void;
}

export function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  return (
    <Button
      onClick={toggleTheme}
      className="ml-4 cursor-pointer relative transition-colors"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      <span className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center">
        <motion.span
          key="sun"
          animate={{
            rotate: theme === "dark" ? 0 : 90,
            scale: theme === "dark" ? 1 : 0.7,
            opacity: theme === "dark" ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute"
          style={{ willChange: "transform, opacity" }}
        >
          <SunIcon className="w-6 h-6" />
        </motion.span>
        <motion.span
          key="moon"
          animate={{
            rotate: theme === "light" ? 0 : -90,
            scale: theme === "light" ? 1 : 0.7,
            opacity: theme === "light" ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute"
          style={{ willChange: "transform, opacity" }}
        >
          <MoonIcon className="w-6 h-6" />
        </motion.span>
      </span>
      <span className="invisible">
        <SunIcon className="w-6 h-6" />
      </span>
    </Button>
  );
}
