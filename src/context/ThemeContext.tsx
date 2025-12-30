import React, { createContext, useContext, ReactNode } from "react";
import { COLORS } from "../constants/config";

type ThemeContextType = {
  colors: typeof COLORS;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext.Provider value={{ colors: COLORS }}>{children}</ThemeContext.Provider>
);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};