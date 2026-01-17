import React from "react";
import { useAuthContext } from "../context/AuthContext";
import { usePinContext } from "../context/PinContext";
import AuthNavigator from "./AuthNavigator";
import MemberNavigator from "./MemberNavigator";
import AdminNavigator from "./AdminNavigator";
import PinScreen from "../screens/auth/PinScreen";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../constants/config";

export default function AppNavigator() {
  const { user, isLoading } = useAuthContext();
  const { requirePinSetup, requirePinEntry } = usePinContext();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Pas d'utilisateur = écrans d'auth
  if (!user) {
    return <AuthNavigator />;
  }

  // Utilisateur connecté MAIS doit définir un PIN (premier login ou PIN oublié)
  if (requirePinSetup) {
    return <PinScreen mode="setup" />;
  }

  // Utilisateur connecté MAIS doit saisir son PIN (ouverture app)
  if (requirePinEntry) {
    return <PinScreen mode="enter" />;
  }

  // Utilisateur connecté ET PIN validé = navigation normale
  if (user.is_administrateur) {
    return <AdminNavigator />;
  }

  return <MemberNavigator />;
}