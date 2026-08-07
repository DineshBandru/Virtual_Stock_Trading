import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

const ThemeContext = createContext();

const getInitialPreference = () => {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem("themePreference") || localStorage.getItem("theme") || "system";
};

const getSystemTheme = () => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreference] = useState(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useLayoutEffect(() => {
    localStorage.setItem("themePreference", themePreference);
    localStorage.setItem("theme", themePreference);
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setThemePreference((prev) => {
      const current = prev === "system" ? resolvedTheme : prev;
      return current === "dark" ? "light" : "dark";
    });
  };

  const value = useMemo(
    () => ({
      theme: resolvedTheme,
      resolvedTheme,
      themePreference,
      setThemePreference,
      toggleTheme
    }),
    [resolvedTheme, themePreference]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
