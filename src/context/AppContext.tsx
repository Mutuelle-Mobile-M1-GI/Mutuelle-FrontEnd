import React, { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  isAppLoading: boolean;
  setAppLoading: (loading: boolean) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isAppLoading, setAppLoading] = useState(false);

  // Pour l'exemple, on ne fait qu'un simple alert
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    alert(`[${type.toUpperCase()}] ${msg}`);
  };

  return (
    <AppContext.Provider value={{ isAppLoading, setAppLoading, showToast }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};