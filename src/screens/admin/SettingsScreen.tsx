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
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { 
  useMutuelleConfig, 
  useUpdateMutuelleConfig, 
  useCreateNewExercise 
} from "../../hooks/useConfig"; // ✅ Import des mutations
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MutuelleConfig } from "../../types/config.types";
import ExerciseModal from "../../components/ExerciseModal";

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  currentValue: string | number;
  onSave: (value: string) => Promise<void>; // ✅ Async function
  type?: "text" | "number";
  placeholder?: string;
  loading?: boolean; // ✅ Loading state
}


const ConfigModal = ({ 
  visible, 
  onClose, 
  title, 
  currentValue, 
  onSave, 
  type = "number", 
  placeholder,
  loading = false 
}: ConfigModalProps) => {
  const [value, setValue] = useState(currentValue.toString());
  const [localLoading, setLocalLoading] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    
    setLocalLoading(true);
    try {
      await onSave(value);
      onClose();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder la modification");
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Nouvelle valeur</Text>
            <TextInput
              style={styles.modalInput}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder || "Saisissez la nouvelle valeur"}
              keyboardType={type === "number" ? "numeric" : "default"}
              autoFocus
              editable={!isLoading}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton} 
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSaveButton, 
                (isLoading || !value.trim()) && styles.modalSaveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={isLoading || !value.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalSaveText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function SettingsScreen() {
  const { logout, currentUserQuery } = useAuth();
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useMutuelleConfig();
  
  // ✅ MUTATIONS
  const updateConfigMutation = useUpdateMutuelleConfig();
  const createExerciseMutation = useCreateNewExercise();
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  // ✅ CRÉATION NOUVEL EXERCICE CORRIGÉE
  const handleCreateNewExercise = () => {
    setExerciseModalVisible(true);
  };
  
  const navigation = useNavigation();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [currentConfigField, setCurrentConfigField] = useState<{
    key: keyof MutuelleConfig;
    title: string;
    value: string | number;
    type?: "text" | "number";
  } | null>(null);

  const user = currentUserQuery.data;

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              navigation.navigate("Login");
            } catch (error) {
              Alert.alert("Erreur", "Impossible de se déconnecter");
            }
          },
        },
      ]
    );
  };

  const openConfigModal = (key: keyof MutuelleConfig, title: string, type: "text" | "number" = "number") => {
    if (!config) return;
    setCurrentConfigField({
      key,
      title,
      value: config[key],
      type,
    });
    setModalVisible(true);
  };

  // ✅ VRAIE SAUVEGARDE !
  const handleConfigSave = async (value: string) => {
    if (!currentConfigField) return;
    
    try {
      // Convertir la valeur selon le type
      const parsedValue = currentConfigField.type === "number" 
        ? parseFloat(value) 
        : value;

      // Préparer l'objet de mise à jour
      const configUpdate = {
        [currentConfigField.key]: parsedValue
      };

      console.log(`Sauvegarde ${currentConfigField.key}:`, parsedValue);
      const idconf=config?.id

      // ✅ APPEL CORRIGÉ : Passer un objet avec les deux paramètres
      await updateConfigMutation.mutateAsync({
        configUpdates: configUpdate,
        idconf: config?.id || '1'
      });


      // Succès
      Alert.alert(
        "Succès", 
        `${currentConfigField.title} mis à jour avec succès !`,
        [{ text: "OK" }]
      );

      // Fermer le modal
      setModalVisible(false);
      setCurrentConfigField(null);

    } catch (error: any) {
      console.error("Erreur sauvegarde config:", error);
      throw error; // Re-throw pour que le modal gère l'erreur
    }
  };


 const handleExerciseSubmit = async (exerciseData: any) => {
    try {
      console.log("Création exercice avec données:", exerciseData);
      
      await createExerciseMutation.mutateAsync(exerciseData);
      
      Alert.alert("Succès", "Nouvel exercice créé avec succès !");
      setExerciseModalVisible(false);
    } catch (error: any) {
      console.error("Erreur création exercice:", error);
      
      let errorMessage = "Impossible de créer le nouvel exercice";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          // Extraire les erreurs de validation
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          errorMessage = errorMessages || errorMessage;
        }
      }
      
      Alert.alert("Erreur", errorMessage);
      throw error; // Pour que le modal garde l'état loading
    }
  };

  const configItems = config ? [
    {
      key: "montant_inscription" as keyof MutuelleConfig,
      title: "Montant d'inscription",
      value: `${config.montant_inscription.toLocaleString()} FCFA`,
      icon: "card-outline",
    },
    {
      key: "montant_solidarite" as keyof MutuelleConfig,
      title: "Montant solidarité",
      value: `${config.montant_solidarite.toLocaleString()} FCFA`,
      icon: "heart-outline",
    },
    {
      key: "taux_interet" as keyof MutuelleConfig,
      title: "Taux d'intérêt",
      value: `${config.taux_interet}%`,
      icon: "trending-up-outline",
    },
    {
      key: "coefficient_emprunt_max" as keyof MutuelleConfig,
      title: "Coefficient emprunt max",
      value: `${config.coefficient_emprunt_max}x`,
      icon: "calculator-outline",
    },
    {
      key: "duree_exercice_mois" as keyof MutuelleConfig,
      title: "Durée exercice",
      value: `${config.duree_exercice_mois} mois`,
      icon: "calendar-outline",
    },
  ] : [];

  if (configLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des paramètres...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Paramètres</Text>
          <Text style={styles.subtitle}>Administration de la mutuelle</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>{user?.nom_complet}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <Text style={styles.profileRole}>Administrateur</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate("Profile")}
            >
              <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Configuration Mutuelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration Mutuelle</Text>
          {configItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.settingItem}
              onPress={() => openConfigModal(item.key, item.title)}
              disabled={updateConfigMutation.isPending}
            >
              <View style={styles.settingItemLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
              </View>
              {updateConfigMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ✅ NOUVEL EXERCICE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercices</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleCreateNewExercise}
            disabled={createExerciseMutation.isPending}
          >
            <View style={styles.settingItemLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.success} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Créer nouvel exercice</Text>
                <Text style={styles.settingDescription}>Démarrer un nouvel exercice financier</Text>
              </View>
            </View>
            {createExerciseMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.success} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={styles.settingItemLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Changer le mot de passe</Text>
                <Text style={styles.settingDescription}>Modifier votre mot de passe</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("Pin")}
          >
            <View style={styles.settingItemLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="keypad-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Changer le code PIN</Text>
                <Text style={styles.settingDescription}>Redéfinir votre code PIN</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
        <View style={{height:70}}></View>
      </ScrollView>

      {/* Modal de configuration */}
      {currentConfigField && (
        <ConfigModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setCurrentConfigField(null);
          }}
          title={currentConfigField.title}
          currentValue={currentConfigField.value}
          onSave={handleConfigSave}
          type={currentConfigField.type}
          loading={updateConfigMutation.isPending}
        />
      )}

       {/* ✅ NOUVEAU Modal de création d'exercice */}
       <ExerciseModal
        visible={exerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        onSubmit={handleExerciseSubmit}
        loading={createExerciseMutation.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalBody: {
    maxHeight: 400, // ✅ Limite la hauteur pour permettre le scroll
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: 'white',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  profileRole: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  editButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  settingValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorWithOpacity(0.1),
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.errorWithOpacity(0.2),
  },
  logoutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: COLORS.shadowDark,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
 
  modalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalCancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  modalSaveText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: 'white',
  },
});