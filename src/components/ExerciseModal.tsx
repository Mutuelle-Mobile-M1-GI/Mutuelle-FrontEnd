import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../constants/config";

const { width } = Dimensions.get("window");

interface ExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

interface FormData {
  nom: string;
  date_debut: Date;
  date_fin: Date | null;
  description: string;
  statut: string;
}

const STATUT_OPTIONS = [
  { value: "EN_PREPARATION", label: "En préparation", color: "#38A3A5", icon: "construct" },
  { value: "EN_COURS", label: "En cours", color: "#4361EE", icon: "play-circle" },
  { value: "PLANIFIE", label: "Planifié", color: "#F77F00", icon: "calendar" },
];

export default function ExerciseModal({ visible, onClose, onSubmit, loading }: ExerciseModalProps) {
  const currentYear = new Date().getFullYear();
  const today = new Date();
  
  const [formData, setFormData] = useState<FormData>({
    nom: "",
    date_debut: today,
    date_fin: null, // ✅ Null par défaut
    description: "",
    statut: "EN_COURS"
  });

  const [showDatePicker, setShowDatePicker] = useState<{
    visible: boolean;
    field: 'date_debut' | 'date_fin';
    mode: 'date' | 'time';
  }>({
    visible: false,
    field: 'date_debut',
    mode: 'date'
  });

  const [showStatutPicker, setShowStatutPicker] = useState(false);

  // 🎯 Validation et soumission
  const handleSubmit = async () => {
    // Validation minimale
    if (!formData.date_debut) {
      Alert.alert("Erreur", "Veuillez saisir la date de début");
      return;
    }

    // Validation cohérence des dates
    if (formData.date_fin && formData.date_fin <= formData.date_debut) {
      Alert.alert("Erreur", "La date de fin doit être postérieure à la date de début");
      return;
    }

    try {
      // Préparer les données pour l'API
      const apiData = {
        nom: formData.nom.trim() || `Exercice ${formData.date_debut.getFullYear()}`,
        date_debut: formData.date_debut.toISOString().split('T')[0],
        date_fin: formData.date_fin ? formData.date_fin.toISOString().split('T')[0] : null,
        description: formData.description.trim(),
        statut: formData.statut
      };

      console.log("📤 Envoi données exercice:", apiData);
      
      await onSubmit(apiData);
      
      // Reset form après succès
      setFormData({
        nom: "",
        date_debut: new Date(),
        date_fin: null,
        description: "",
        statut: "EN_COURS"
      });
      
    } catch (error) {
      console.error("❌ Erreur soumission exercice:", error);
      // L'erreur est gérée par le parent
    }
  };

  // 📅 Gestion des sélecteurs de date
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker({ ...showDatePicker, visible: false });
    }

    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        [showDatePicker.field]: selectedDate
      }));
    }
  };

  const openDatePicker = (field: 'date_debut' | 'date_fin') => {
    setShowDatePicker({
      visible: true,
      field: field,
      mode: 'date'
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatutInfo = (statut: string) => {
    return STATUT_OPTIONS.find(option => option.value === statut) || STATUT_OPTIONS[0];
  };

  const calculateDuration = () => {
    if (!formData.date_debut || !formData.date_fin) return null;
    
    const diffTime = formData.date_fin.getTime() - formData.date_debut.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.round(diffDays / 30.44); // Moyenne de jours par mois
    
    return {
      days: diffDays,
      months: diffMonths
    };
  };

  const duration = calculateDuration();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* 🎨 Header avec gradient */}
          <LinearGradient
            colors={["#4361EE", "#3A86FF"]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Ionicons name="calendar" size={24} color="white" />
                <Text style={styles.modalTitle}>Nouvel Exercice</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* 📋 Corps du formulaire */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            
            {/* 📝 Nom de l'exercice */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="document-text" size={16} color={COLORS.primary} /> Nom de l'exercice
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.nom}
                onChangeText={(text) => setFormData({ ...formData, nom: text })}
                placeholder={`Exercice ${currentYear + 1}`}
                placeholderTextColor={COLORS.textLight}
                editable={!loading}
              />
              <Text style={styles.helperText}>
                Laissez vide pour génération automatique
              </Text>
            </View>

            {/* 📅 Date de début */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="play-circle" size={16} color={COLORS.success} /> Date de début *
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openDatePicker('date_debut')}
                disabled={loading}
              >
                <View style={styles.dateButtonContent}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.dateButtonText}>
                    {formatDate(formData.date_debut) || "Sélectionner"}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 📅 Date de fin */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="stop-circle" size={16} color={COLORS.warning} /> Date de fin
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openDatePicker('date_fin')}
                disabled={loading}
              >
                <View style={styles.dateButtonContent}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <Text style={[
                    styles.dateButtonText,
                    !formData.date_fin && { color: COLORS.textLight }
                  ]}>
                    {formData.date_fin ? formatDate(formData.date_fin) : "Calcul automatique"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, date_fin: null })}
                  style={styles.clearButton}
                  disabled={loading}
                >
                  <Ionicons 
                    name={formData.date_fin ? "close-circle" : "chevron-down"} 
                    size={16} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                {formData.date_fin 
                  ? "Date personnalisée définie"
                  : "Sera calculée selon la configuration (12 mois par défaut)"
                }
              </Text>
            </View>

            {/* ⏱️ Durée calculée */}
            {duration && (
              <View style={styles.durationCard}>
                <Ionicons name="time" size={16} color={COLORS.primary} />
                <Text style={styles.durationText}>
                  Durée: {duration.months} mois ({duration.days} jours)
                </Text>
              </View>
            )}

            {/* 🏷️ Statut */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="flag" size={16} color={COLORS.warning} /> Statut
              </Text>
              <TouchableOpacity
                style={styles.statutButton}
                onPress={() => setShowStatutPicker(true)}
                disabled={loading}
              >
                <View style={styles.statutButtonContent}>
                  <View style={styles.statutIndicator}>
                    <Ionicons 
                      name={getStatutInfo(formData.statut).icon as any} 
                      size={18} 
                      color={getStatutInfo(formData.statut).color} 
                    />
                    <Text style={[styles.statutText, { color: getStatutInfo(formData.statut).color }]}>
                      {getStatutInfo(formData.statut).label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* 📄 Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="document" size={16} color={COLORS.textSecondary} /> Description
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Description détaillée de l'exercice (optionnel)..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <View style={{ height: SPACING.xl }} />
          </ScrollView>

          {/* 🎯 Actions */}
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
              <LinearGradient
                colors={loading ? [COLORS.textLight, COLORS.textLight] : ["#4361EE", "#3A86FF"]}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.submitButtonText}>Créer Exercice</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* 📅 Sélecteur de date natif */}
        {showDatePicker.visible && (
          <DateTimePicker
            value={formData[showDatePicker.field] || new Date()}
            mode={showDatePicker.mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={showDatePicker.field === 'date_fin' ? formData.date_debut : undefined}
          />
        )}

        {/* 🏷️ Sélecteur de statut */}
        <Modal visible={showStatutPicker} transparent animationType="slide">
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowStatutPicker(false)}
          >
            <View style={styles.pickerContent}>
              <Text style={styles.pickerTitle}>Choisir le statut</Text>
              {STATUT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    formData.statut === option.value && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, statut: option.value });
                    setShowStatutPicker(false);
                  }}
                >
                  <Ionicons name={option.icon as any} size={20} color={option.color} />
                  <Text style={[styles.pickerOptionText, { color: option.color }]}>
                    {option.label}
                  </Text>
                  {formData.statut === option.value && (
                    <Ionicons name="checkmark" size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: width - SPACING.lg * 2,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },

  // Header
  modalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
  },
  closeButton: {
    padding: SPACING.xs,
  },

  // Body
  modalBody: {
    maxHeight: 450,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: "italic",
  },

  // Date buttons
  dateButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: "500",
  },
  clearButton: {
    padding: SPACING.xs,
  },

  // Duration card
  durationCard: {
    backgroundColor: COLORS.primaryWithOpacity(0.1),
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  durationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },

  // Statut button
  statutButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statutIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
  },

  // Actions
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
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },

  // Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: "50%",
  },
  pickerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.surface,
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
    flex: 1,
  },
});