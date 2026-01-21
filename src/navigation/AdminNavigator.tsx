import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import TabNavigator from "./TabNavigator";

// Screens partagés
import ProfileScreen from "../screens/shared/ProfileScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import ChatbotScreen from "../screens/shared/ChatbotScreen";
import PinScreen from "../screens/auth/PinScreen";

// Screens admin
import MembersManagementScreen from "../screens/admin/MembersManagementScreen";

// 🆕 Pages des modules admin (versions temporaires)
import InscriptionsScreen from "../screens/admin/InscriptionsScreen";
import SavingsScreen from "../screens/admin/SavingsScreen";
import AssistanceScreen from "../screens/admin/AssistanceScreen";
import SolidarityScreen from "../screens/admin/SolidarityScreen";
import LoansScreen from "../screens/admin/LoansScreen";
import RepaymentsScreen from "../screens/admin/RepaymentsScreen";
import LoginScreen from "../screens/auth/LoginScreen";

const Stack = createStackNavigator();

export default function AdminNavigator() {
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
      
      {/* 🆕 Pages des modules admin */}
      <Stack.Screen 
        name="InscriptionsScreen" 
        component={InscriptionsScreen}
        options={{
          presentation: "card",
          headerShown: false,
          title: "Gestion des Inscriptions",
        }}
      />
      
      <Stack.Screen 
        name="SavingsScreen" 
        component={SavingsScreen}
        options={{
          presentation: "card",
          headerShown: false,
          title: "Gestion des Épargnes",
        }}
      />
      
      <Stack.Screen 
        name="AssistanceScreen" 
        component={AssistanceScreen}
        options={{
          presentation: "card",
          headerShown: false,
          title: "Gestion des Assistances",
        }}
      />
      
      <Stack.Screen 
        name="SolidarityScreen" 
        component={SolidarityScreen}
        options={{
          presentation: "card",
          headerShown: false,
          title: "Fonds Social & Solidarité",
        }}
      />
      
      <Stack.Screen 
        name="LoansScreen" 
        component={LoansScreen}
        options={{
          presentation: "card",
          headerShown: false,
          title: "Gestion des Emprunts",
        }}
      />
      
      <Stack.Screen 
        name="RepaymentsScreen" 
        component={RepaymentsScreen}
        options={{
          presentation: "card",
          headerShown: false,
          title: "Gestion des Remboursements",
        }}
      />

      {/* Screens partagés et modaux */}
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
          headerShown: true,
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
      
      <Stack.Screen 
        name="MembersManagement" 
        component={MembersManagementScreen}
        options={{
          presentation: "card",
          headerShown: true,
          title: "Gestion des Membres",
        }}
      />

  <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}