import React, { useEffect } from "react";
import { ThemeProvider } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { AppProvider } from "./src/context/AppContext";
import { PinProvider } from "./src/context/PinContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Empêche React Query de boucler à l'infini en cas d'erreur réseau
    },
  },
});

export default function App() {
  
  // BLOC DE DÉPANNAGE : À supprimer après avoir réussi à vous connecter
  useEffect(() => {
    const clearAppStorage = async () => {
      try {
        await AsyncStorage.clear();
        console.log("🧹 Nettoyage terminé : Ancien PIN et Token supprimés.");
      } catch (e) {
        console.error("Erreur lors du nettoyage", e);
      }
    };
    clearAppStorage();
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PinProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <AppNavigator />
              </NavigationContainer>
            </PinProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AppProvider>
    </ThemeProvider>
  );
}