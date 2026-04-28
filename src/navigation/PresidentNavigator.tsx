import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import TabNavigator from "./TabNavigator";

import ProfileScreen from "../screens/shared/ProfileScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import ChatbotScreen from "../screens/shared/ChatbotScreen";
import PinScreen from "../screens/auth/PinScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import MembersManagementScreen from "../screens/admin/MembersManagementScreen";

import InscriptionsScreen from "../screens/admin/InscriptionsScreen";
import SavingsScreen from "../screens/admin/SavingsScreen";
import AssistanceScreen from "../screens/admin/AssistanceScreen";
import SolidarityScreen from "../screens/admin/SolidarityScreen";
import LoansScreen from "../screens/admin/LoansScreen";
import RepaymentsScreen from "../screens/admin/RepaymentsScreen";

const Stack = createStackNavigator();

// ✅ Défini HORS du composant pour éviter le warning inline function
const PinSetupScreen = (props: any) => <PinScreen {...props} mode="setup" />;

export default function PresidentNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      {/* Tab Navigator principal — contient déjà SettingsScreen via ParamètresBureau */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ presentation: "card" }}
      />

      {/* Modules de consultation */}
      <Stack.Screen
        name="InscriptionsScreen"
        component={InscriptionsScreen}
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="SavingsScreen"
        component={SavingsScreen}
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="AssistanceScreen"
        component={AssistanceScreen}
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="SolidarityScreen"
        component={SolidarityScreen}
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="LoansScreen"
        component={LoansScreen}
        options={{ presentation: "card", headerShown: false }}
      />
      <Stack.Screen
        name="RepaymentsScreen"
        component={RepaymentsScreen}
        options={{ presentation: "card", headerShown: false }}
      />

      {/* Écrans partagés */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: "modal", headerShown: true, title: "Notifications" }}
      />
      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="Pin"
        component={PinSetupScreen}
        options={{ presentation: "modal", headerShown: true, title: "Code PIN" }}
      />
      <Stack.Screen
        name="MembersManagement"
        component={MembersManagementScreen}
        options={{ presentation: "card", headerShown: true, title: "Membres" }}
      />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}