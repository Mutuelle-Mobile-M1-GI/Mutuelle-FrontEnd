import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES } from "../../constants/config";

export default function RefundsManagementScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wallet" size={48} color={COLORS.primary} />
        <Text style={styles.title}>Gestion des ..</Text>
        <Text style={styles.subtitle}>🚧 Page en développement</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});