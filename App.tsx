import React from "react";
import GlobalRefreshButton from "./src/components/GlobalRefreshButton";
import { ThemeProvider } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { AppProvider } from "./src/context/AppContext";
import { PinProvider } from "./src/context/PinContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Empêche React Query de boucler à l'infini en cas d'erreur réseau
    },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PinProvider>
            <View style={{ flex: 1 }}>
              <NavigationContainer>
                <StatusBar style="dark" />
                <AppNavigator />
              </NavigationContainer>
              <GlobalRefreshButton />
              </View>
            </PinProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AppProvider>
    </ThemeProvider>
  );
}