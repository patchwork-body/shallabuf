import { useCallback, useEffect, useLayoutEffect, useState } from "react";

// Helper to get theme from cookies (SSR or client)
export function getThemeFromCookie(cookieString?: string): "light" | "dark" {
  if (typeof document !== "undefined" && !cookieString) {
    cookieString = document.cookie;
  }

  if (!cookieString) return "light";
  const match = cookieString.match(/theme-preference=(dark|light)/);

  if (match) return match[1] as "dark" | "light";

  return "light";
}

// Helper to set theme cookie
function setThemeCookie(theme: "light" | "dark") {
  document.cookie = `theme-preference=${theme}; path=/; max-age=31536000`;
}

const getInitialTheme = () => {
  // Client: check cookie
  const theme = getThemeFromCookie();
  if (theme === "light" || theme === "dark") return theme;
  // Fallback to system
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    setThemeCookie(theme);
  }, [theme]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (!getThemeFromCookie()) {
        setTheme(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
