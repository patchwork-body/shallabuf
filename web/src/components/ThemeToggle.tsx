import { Button } from "./ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    setTheme(initialTheme);
    updateTheme(initialTheme);
  }, []);

  const updateTheme = useCallback((newTheme: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      updateTheme(newTheme);
      return newTheme;
    });
  }, [updateTheme]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="ml-4 cursor-pointer relative size-8 hover:scale-110 transition-all duration-200"
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key="sun"
          initial={{
            rotate: theme === "dark" ? 0 : 90,
            scale: theme === "dark" ? 1 : 0.7,
            opacity: theme === "dark" ? 1 : 0,
          }}
          animate={{
            rotate: theme === "dark" ? 0 : 90,
            scale: theme === "dark" ? 1 : 0.7,
            opacity: theme === "dark" ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute will-change-transform will-change-opacity"
        >
          <SunIcon className="size-5" />
        </motion.span>

        <motion.span
          key="moon"
          initial={{
            rotate: theme === "light" ? 0 : -90,
            scale: theme === "light" ? 1 : 0.7,
            opacity: theme === "light" ? 1 : 0,
          }}
          animate={{
            rotate: theme === "light" ? 0 : -90,
            scale: theme === "light" ? 1 : 0.7,
            opacity: theme === "light" ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute will-change-transform will-change-opacity"
        >
          <MoonIcon className="size-5" />
        </motion.span>
      </span>
    </Button>
  );
};
