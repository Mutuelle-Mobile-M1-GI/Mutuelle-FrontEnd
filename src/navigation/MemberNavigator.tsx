import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import TabNavigator from "./TabNavigator";

// Screens partagés
import ProfileScreen from "../screens/shared/ProfileScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import ChatbotScreen from "../screens/shared/ChatbotScreen";
import PinScreen from "../screens/auth/PinScreen";

const Stack = createStackNavigator();

export default function MemberNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      {/* Tab Navigator principal */}
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
        options={{
          presentation: "card",
        }}
      />
      
      {/* Screens partagés */}
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          presentation: "modal",
          headerShown: false,
          title: "Mon Profil",
        }}
      />
      
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          presentation: "modal",
          headerShown: false,
          title: "Notifications",
        }}
      />
      
      <Stack.Screen 
        name="Chatbot" 
        component={ChatbotScreen}
        options={{
          presentation: "modal",
          headerShown: false,
          title: "Assistant",
        }}
      />

      {/* 🆕 Pin Screen */}
      <Stack.Screen 
        name="Pin" 
        component={(props) => <PinScreen {...props} mode="setup" />}
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Code PIN",
        }}
      />
    </Stack.Navigator>
  );
}