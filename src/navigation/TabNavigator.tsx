import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../constants/config";
import { useAuthContext } from "../context/AuthContext";

// Screens
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import FinancialReportsScreen from "../screens/admin/FinancialReportsScreen";
import SettingsScreen from "../screens/admin/SettingsScreen";
import RenflouementScreen from "../screens/admin/RenflouementScreen";
import MemberDashboardScreen from "../screens/member/MemberDashboardScreen";
import MemberHistoryScreen from "../screens/member/MemberHistoryScreen";
import MemberSettingsScreen from "../screens/member/MemberSettingsScreen";
import ChatbotFAB from "../components/ChatbotFAB";

const Tab = createBottomTabNavigator();

interface CustomTabBarIconProps {
  route: string;
  focused: boolean;
  color: string;
  size: number;
}

const CustomTabBarIcon = ({ route, focused, color, size }: CustomTabBarIconProps) => {
  const getIconName = () => {
    switch (route) {
      case "AccueilAdmin":
      case "Accueil":
        return focused ? "home" : "home-outline";
      case "Bilan":
        return focused ? "bar-chart" : "bar-chart-outline";
      case "Renflouement":
        return focused ? "refresh-circle" : "refresh-circle-outline";
      case "Historique":
        return focused ? "time" : "time-outline";
      case "ParamètresAdmin":
      case "Paramètres":
        return focused ? "settings" : "settings-outline";
      default:
        return "help-outline";
    }
  };

  return (
    <View style={styles.iconContainer}>
      {/* Indicateur de focus */}
      {focused && <View style={styles.activeIndicator} />}
      
      {/* Icône */}
      <Ionicons 
        name={getIconName() as any} 
        size={size} 
        color={focused ? COLORS.primary : color} 
      />
    </View>
  );
};

interface CustomTabBarLabelProps {
  route: string;
  focused: boolean;
  color: string;
}

const CustomTabBarLabel = ({ route, focused, color }: CustomTabBarLabelProps) => {
  const getLabel = () => {
    switch (route) {
      case "AccueilAdmin":
      case "Accueil":
        return "Accueil";
      case "Bilan":
        return "Bilan";
      case "Renflouement":
        return "Renflouement";
      case "Historique":
        return "Historique";
      case "ParamètresAdmin":
      case "Paramètres":
        return "Paramètres";
      default:
        return route;
    }
  };

  return (
    <Text
      style={[
        styles.tabLabel,
        {
          color: focused ? COLORS.primary : color,
          fontWeight: focused ? "600" : "400",
        },
      ]}
    >
      {getLabel()}
    </Text>
  );
};

export default function TabNavigator() {
  const { user } = useAuthContext();

  const commonScreenOptions = ({ route }: { route: any }) => ({
    headerShown: false,
    tabBarStyle: {
      position: "absolute" as const,
      bottom: SPACING.md,
      left: SPACING.md,
      right: SPACING.md,
      height: 70,
      backgroundColor: COLORS.background,
      borderRadius: BORDER_RADIUS.xl,
      borderTopWidth: 0,
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: COLORS.shadowDark,
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
      <CustomTabBarIcon route={route.name} focused={focused} color={color} size={size} />
    ),
    tabBarLabel: ({ focused, color }: { focused: boolean; color: string }) => (
      <CustomTabBarLabel route={route.name} focused={focused} color={color} />
    ),
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarItemStyle: {
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.xs,
    },
  });

  return (<View style={{ flex: 1 }}>
    <Tab.Navigator
      initialRouteName={user?.is_administrateur ? "AccueilAdmin" : "Accueil"}
      screenOptions={commonScreenOptions}
    >
      {user?.is_administrateur ? (
        // 👑 NAVIGATION ADMIN (4 onglets)
        <>
          <Tab.Screen
            name="AccueilAdmin"
            component={AdminDashboardScreen}
            options={{
              title: "Accueil",
            }}
          />
          <Tab.Screen
            name="Bilan"
            component={FinancialReportsScreen}
            options={{
              title: "Bilan",
            }}
          />
          <Tab.Screen
            name="Renflouement"
            component={RenflouementScreen}
            options={{
              title: "Renflouement",
            }}
          />
          <Tab.Screen
            name="ParamètresAdmin"
            component={SettingsScreen}
            options={{
              title: "Paramètres",
            }}
          />
        </>
      ) : (
        // 👤 NAVIGATION MEMBRE (3 onglets)
        <>
          <Tab.Screen
            name="Accueil"
            component={MemberDashboardScreen}
            options={{
              title: "Accueil",
            }}
          />
          <Tab.Screen
            name="Historique"
            component={MemberHistoryScreen}
            options={{
              title: "Historique",
            }}
          />
          <Tab.Screen
            name="Paramètres"
            component={MemberSettingsScreen}
            options={{
              title: "Paramètres",
            }}
          />
        </>
      )}
    </Tab.Navigator>
    <ChatbotFAB />
    
  </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 40,
    position: "relative",
  },
  
  activeIndicator: {
    position: "absolute",
    top: -4,
    width: 32,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  tabLabel: {
    fontSize: FONT_SIZES.xs,
    textAlign: "center",
    marginTop: SPACING.xs,
    letterSpacing: 0.5,
  },
});