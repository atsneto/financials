import { createContext, useContext, useEffect, useRef, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeLock(lockedTheme) {
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef(theme);

  useEffect(() => {
    previousThemeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const previousTheme = previousThemeRef.current;

    if (theme !== lockedTheme) {
      setTheme(lockedTheme);
    }

    return () => {
      if (previousTheme !== lockedTheme) {
        setTheme(previousTheme);
      }
    };
  }, [lockedTheme, setTheme]);
}
