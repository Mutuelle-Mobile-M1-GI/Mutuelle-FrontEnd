import React from "react";
import { TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../constants/config";
import { useNavigation } from "@react-navigation/native";

export default function ChatbotFAB() {
  const navigation = useNavigation();
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Animation de clic
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    navigation.navigate("Chatbot");
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale: scaleValue }] }]}>
      <TouchableOpacity
        style={styles.fabButton}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={24} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 100, // Au-dessus de la tab bar
    right: SPACING.lg,
    zIndex: 1000,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadowDark,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});