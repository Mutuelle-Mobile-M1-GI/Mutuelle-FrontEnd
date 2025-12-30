import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/config";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue !</Text>
      <Text style={styles.text}>
        Ceci est la page d'accueil temporaire.{"\n"}Navigation et authentification OK 🎉
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.7,
  },
});