import React from "react";
import { useAuthContext } from "../context/AuthContext";
import { usePinContext } from "../context/PinContext";
import AuthNavigator from "./AuthNavigator";
import MemberNavigator from "./MemberNavigator";
import AdminNavigator from "./AdminNavigator";
import TresorierNavigator from "./TresorierNavigator";
import PresidentNavigator from "./PresidentNavigator";
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

  if (!user) return <AuthNavigator />;

  if (requirePinSetup) return <PinScreen mode="setup" />;

  if (requirePinEntry) return <PinScreen mode="enter" />;

  if (user.role === 'SECRETAIRE_GENERALE' || user.is_administrateur) {
    return <AdminNavigator />;
  }

  if (user.role === 'TRESORIER') {
    return <TresorierNavigator />;
  }

  if (user.role === 'PRESIDENT') {
    return <PresidentNavigator />;
  }

  return <MemberNavigator />;
}
