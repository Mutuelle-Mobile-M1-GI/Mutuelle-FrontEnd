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
//import ChatbotFAB from "../components/ChatbotFAB";

const Tab = createBottomTabNavigator();

const CustomTabBarIcon = ({
  route,
  focused,
  color,
  size,
}: {
  route: string;
  focused: boolean;
  color: string;
  size: number;
}) => {
  const getIconName = () => {
    switch (route) {
      case "AccueilAdmin":
      case "AccueilBureau":
      case "Accueil":
        return focused ? "home" : "home-outline";
      case "Renflouement":
        return focused ? "refresh-circle" : "refresh-circle-outline";
      case "Historique":
        return focused ? "time" : "time-outline";
      case "ParamètresAdmin":
      case "ParamètresBureau":
      case "Paramètres":
        return focused ? "settings" : "settings-outline";
      default:
        return "help-outline";
    }
  };

  return (
    <View style={styles.iconContainer}>
      {focused && <View style={styles.activeIndicator} />}
      <Ionicons
        name={getIconName() as any}
        size={size}
        color={focused ? COLORS.primary : color}
      />
    </View>
  );
};

const CustomTabBarLabel = ({
  route,
  focused,
  color,
}: {
  route: string;
  focused: boolean;
  color: string;
}) => {
  const getLabel = () => {
    switch (route) {
      case "AccueilAdmin":
      case "AccueilBureau":
      case "Accueil":
        return "Accueil";
      case "Renflouement":
        return "Renflouement";
      case "Historique":
        return "Historique";
      case "ParamètresAdmin":
      case "ParamètresBureau":
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

  const isMembre            = user?.role === "MEMBRE" || user?.is_membre === true;
  const isBureauLectureSeule = user?.role === "TRESORIER" || user?.role === "PRESIDENT";

  // initialRouteName correspond TOUJOURS à un onglet existant dans le bon set
  const initialRoute = isMembre
    ? "Accueil"
    : isBureauLectureSeule
    ? "AccueilBureau"
    : "AccueilAdmin";

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
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    tabBarIcon: ({
      focused,
      color,
      size,
    }: {
      focused: boolean;
      color: string;
      size: number;
    }) => (
      <CustomTabBarIcon
        route={route.name}
        focused={focused}
        color={color}
        size={size}
      />
    ),
    tabBarLabel: ({
      focused,
      color,
    }: {
      focused: boolean;
      color: string;
    }) => (
      <CustomTabBarLabel route={route.name} focused={focused} color={color} />
    ),
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarItemStyle: {
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.xs,
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName={initialRoute}
        screenOptions={commonScreenOptions}
      >
        {isMembre ? (
          // 👤 MEMBRE — 3 onglets
          <>
            <Tab.Screen name="Accueil"    component={MemberDashboardScreen} />
            <Tab.Screen name="Historique" component={MemberHistoryScreen} />
            <Tab.Screen name="Paramètres" component={MemberSettingsScreen} />
          </>
        ) : isBureauLectureSeule ? (
          // 👁 TRÉSORIER / PRÉSIDENT — 4 onglets AVEC Paramètres (lecture seule)
          <>
            <Tab.Screen name="AccueilBureau"    component={AdminDashboardScreen} />
            <Tab.Screen name="Historique"        component={FinancialReportsScreen} />
            <Tab.Screen name="Renflouement"      component={RenflouementScreen} />
            <Tab.Screen name="ParamètresBureau"  component={SettingsScreen} />
          </>
        ) : (
          // 👑 SECRÉTAIRE GÉNÉRALE — 4 onglets complets
          <>
            <Tab.Screen name="AccueilAdmin"   component={AdminDashboardScreen} />
            <Tab.Screen name="Historique"      component={FinancialReportsScreen} />
            <Tab.Screen name="Renflouement"    component={RenflouementScreen} />
            <Tab.Screen name="ParamètresAdmin" component={SettingsScreen} />
          </>
        )}
      </Tab.Navigator>
      {/* <ChatbotFAB /> */}
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