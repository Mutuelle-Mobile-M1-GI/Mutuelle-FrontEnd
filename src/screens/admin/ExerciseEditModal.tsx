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

interface ExerciseEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  loading: boolean;
  isEditing?: boolean; // true = édition, false = création
}

export const ExerciseEditModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  loading,
  isEditing = false,
}: ExerciseEditModalProps) => {
  const [formData, setFormData] = useState({
    nom: "",
    date_debut: new Date().toISOString().split("T")[0],
    date_fin: "",
    description: "",
  });

  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        nom: initialData.nom || "",
        date_debut: initialData.date_debut || new Date().toISOString().split("T")[0],
        date_fin: initialData.date_fin || "",
        description: initialData.description || "",
      });
    } else {
      setFormData({
        nom: "",
        date_debut: new Date().toISOString().split("T")[0],
        date_fin: "",
        description: "",
      });
    }
  }, [initialData, isEditing, visible]);

  const handleSubmit = async () => {
    if (!formData.nom.trim()) {
      Alert.alert("Erreur", "Le nom de l'exercice est requis");
      return;
    }

    if (!formData.date_debut.trim()) {
      Alert.alert("Erreur", "La date de début est requise");
      return;
    }

    try {
      await onSubmit({
        nom: formData.nom.trim(),
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || null,
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
              {isEditing ? "Modifier l'exercice" : "Nouvel exercice"}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Nom de l'exercice</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Exercice 2026"
              value={formData.nom}
              onChangeText={(text) => setFormData({ ...formData, nom: text })}
              editable={!loading}
            />

            <Text style={styles.inputLabel}>Date de début</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.date_debut}
              onChangeText={(text) => setFormData({ ...formData, date_debut: text })}
              editable={!loading}
            />
            <Text style={styles.helperText}>Format: YYYY-MM-DD (ex: 2026-01-01)</Text>

            <Text style={styles.inputLabel}>Date de fin (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.date_fin}
              onChangeText={(text) => setFormData({ ...formData, date_fin: text })}
              editable={!loading}
            />
            <Text style={styles.helperText}>Laissez vide si l'exercice est en cours</Text>

            <Text style={styles.inputLabel}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
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
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: SPACING.md,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: "italic",
  },
  modalActions: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
