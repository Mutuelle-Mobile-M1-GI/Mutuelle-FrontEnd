import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";

interface SessionEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  loading: boolean;
  isEditing?: boolean; // true = édition, false = création
}

export const SessionEditModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  loading,
  isEditing = false,
}: SessionEditModalProps) => {
  const [formData, setFormData] = useState({
    nom: "",
    date_session: new Date().toISOString().split("T")[0],
    montant_collation: "45000",
    description: "",
  });

  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        nom: initialData.nom || "",
        date_session: initialData.date_session || new Date().toISOString().split("T")[0],
        montant_collation: String(initialData.montant_collation || "45000"),
        description: initialData.description || "",
      });
    } else {
      setFormData({
        nom: "",
        date_session: new Date().toISOString().split("T")[0],
        montant_collation: "45000",
        description: "",
      });
    }
  }, [initialData, isEditing, visible]);

  // Fonction pour valider le format de date YYYY-MM-DD
  const isValidDateFormat = (dateString: string): boolean => {
    if (!dateString) return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    // Vérifier que la date est valide
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleSubmit = async () => {
    // Validation du nom
    if (!formData.nom.trim()) {
      Alert.alert("Erreur", "Le nom de la session est requis");
      return;
    }

    // Validation du format de la date de session
    if (!formData.date_session.trim()) {
      Alert.alert("Erreur", "La date de session est requise");
      return;
    }

    if (!isValidDateFormat(formData.date_session)) {
      Alert.alert("Erreur", "Le format de la date doit être YYYY-MM-DD (ex: 2026-03-15)");
      return;
    }

    // Validation du montant collation
    const montantValue = parseFloat(formData.montant_collation);
    if (isNaN(montantValue) || montantValue < 0) {
      Alert.alert("Erreur", "Le montant collation doit être un nombre positif");
      return;
    }

    try {
      await onSubmit({
        nom: formData.nom.trim(),
        date_session: formData.date_session,
        montant_collation: montantValue,
        description: formData.description.trim(),
      });
      onClose();
    } catch (error) {
      console.error("Erreur en soumettant le formulaire:", error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Modifier la session" : "Nouvelle session"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Nom de la session</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Session Janvier 2025"
              value={formData.nom}
              onChangeText={(text) => setFormData({ ...formData, nom: text })}
              editable={!loading}
            />

            <Text style={styles.inputLabel}>Date de session</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.date_session}
              onChangeText={(text) => setFormData({ ...formData, date_session: text })}
              editable={!loading}
            />

            <Text style={styles.inputLabel}>Montant collation (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="45000"
              value={formData.montant_collation}
              onChangeText={(text) => setFormData({ ...formData, montant_collation: text })}
              keyboardType="numeric"
              editable={!loading}
            />
            <Text style={styles.helperText}>Montant par défaut: 45 000 FCFA</Text>

            <Text style={styles.inputLabel}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              placeholder="Notes ou description..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              editable={!loading}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Mettre à jour" : "Créer"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: "90%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
});
