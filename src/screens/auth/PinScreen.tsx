import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  Vibration,
  TouchableOpacity,
} from "react-native";
import { COLORS, PIN_LENGTH, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { usePinContext } from "../../context/PinContext";
import { useAuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

interface PinScreenProps {
  mode: "setup" | "enter";
}

export default function PinScreen({ mode }: PinScreenProps) {
  const { definePin, validatePin, resetPin } = usePinContext();
  const { setFirstLogin } = useAuthContext();
  
  const [step, setStep] = useState<"create" | "confirm" | "enter">(
    mode === "setup" ? "create" : "enter"
  );
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotsScale = useRef([...Array(PIN_LENGTH)].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animation de secousse pour les erreurs
  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Animation des points PIN
  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.timing(dotsScale[index], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(dotsScale[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNumberPress = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      animateDot(newPin.length - 1);
      setError(null);

      // Auto-submit quand PIN complet
      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => handleSubmit(newPin), 300);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleSubmit = async (currentPin = pin) => {
    if (currentPin.length !== PIN_LENGTH) return;

    setLoading(true);
    setError(null);

    try {
      if (step === "create") {
        setConfirmPin(currentPin);
        setPin("");
        setStep("confirm");
      } else if (step === "confirm") {
        if (currentPin !== confirmPin) {
          setError("Les codes PIN ne correspondent pas");
          shakeAnimation();
          Vibration.vibrate(400);
          setPin("");
        } else {
          await definePin(currentPin);
          // Marquer que ce n'est plus un premier login
          setFirstLogin(false);
          // Navigation automatique via AppNavigator
        }
      } else {
        // step === "enter"
        const isValid = await validatePin(currentPin);
        if (isValid) {
          // Navigation automatique via AppNavigator
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(`Code PIN incorrect (${newAttempts}/5 tentatives)`);
          shakeAnimation();
          Vibration.vibrate([100, 50, 100]);
          setPin("");

          if (newAttempts >= 5) {
            setError("Trop de tentatives. Reconnexion requise.");
            setTimeout(() => resetPin(), 2000);
          }
        }
      }
    } catch (e) {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case "create":
        return "Définir votre code PIN";
      case "confirm":
        return "Confirmer votre PIN";
      default:
        return "Saisir votre code PIN";
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case "create":
        return `Choisissez un code PIN à ${PIN_LENGTH} chiffres pour sécuriser l'accès`;
      case "confirm":
        return "Confirmez votre code PIN";
      default:
        return "Saisissez votre code PIN pour continuer";
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={step === "enter" ? "lock-closed" : "shield-checkmark"} 
                size={48} 
                color={COLORS.primary} 
              />
            </View>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          {/* PIN Dots */}
          <View style={styles.pinContainer}>
            {[...Array(PIN_LENGTH)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.pinDot,
                  pin.length > index && styles.pinDotFilled,
                  {
                    transform: [{ scale: dotsScale[index] }],
                  },
                ]}
              />
            ))}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Number Pad */}
          <View style={styles.numberPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.numberButton}
                onPress={() => handleNumberPress(num.toString())}
                activeOpacity={0.7}
              >
                <View style={styles.numberButtonContent}>
                  <Text style={styles.numberText}>{num}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Last row */}
            <View style={styles.lastRow}>
              <View style={styles.emptyButton} />
              
              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => handleNumberPress("0")}
                activeOpacity={0.7}
              >
                <View style={styles.numberButtonContent}>
                  <Text style={styles.numberText}>0</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleBackspace}
                activeOpacity={0.7}
              >
                <Ionicons name="backspace-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading state */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}

          {/* Forgot PIN (only for enter step) */}
          {step === "enter" && (
            <TouchableOpacity style={styles.forgotButton} onPress={resetPin}>
              <Ionicons name="refresh-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.forgotText}>Code PIN oublié ?</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // BLANC !
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.text, // Texte foncé
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorWithOpacity(0.1),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.errorWithOpacity(0.2),
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  numberButton: {
    width: (width - SPACING.lg * 2 - SPACING.md * 4) / 3,
    height: 70,
    margin: SPACING.sm,
    borderRadius: 35,
    overflow: 'hidden',
  },
  numberButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  numberText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  lastRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    width: (width - SPACING.lg * 2 - SPACING.md * 4) / 3,
    height: 70,
    margin: SPACING.sm,
  },
  actionButton: {
    width: (width - SPACING.lg * 2 - SPACING.md * 4) / 3,
    height: 70,
    margin: SPACING.sm,
    borderRadius: 35,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
});