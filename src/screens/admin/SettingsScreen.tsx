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
  KeyboardAvoidingView,
  Switch,
  Platform,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { 
  useMutuelleConfig, 
  useUpdateMutuelleConfig, 
  useCreateNewExercise, 
  useUpsertTiers
} from "../../hooks/useConfig"; // ✅ Import des mutations
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MutuelleConfig } from "../../types/config.types";
import ExerciseModal from "../../components/ExerciseModal";
import { 
  useAssistanceTypes, 
  useCreateAssistance, 
  useUpdateAssistance, 
  //useDeleteAssistance
} from "../../hooks/useAssistance";

// 🦊 AJOUT: Interface pour les tranches
interface Tier {
  id?: string;
  min_amount: number;
  max_amount: number;
  coefficient: number;
  max_cap?: number | null;
}
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

  const [assistanceManagerVisible, setAssistanceManagerVisible] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  // 2. Fonctions de pont
const handleOpenAdd = () => {
  setSelectedType(null);
  setFormVisible(true);
};

const handleOpenEdit = (type) => {
  setSelectedType(type);
  setFormVisible(true);
};

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

const AssistanceModal = ({ visible, onClose, initialData, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    nom: "",
    montant: "",
    description: "",
    actif: true
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        nom: initialData.nom || "",
        montant: initialData.montant?.toString() || "",
        description: initialData.description || "",
        actif: initialData.actif ?? true
      });
    } else {
      setFormData({ nom: "", montant: "", description: "", actif: true });
    }
  }, [initialData, visible]);

  const handleSubmit = () => {
    if (!formData.nom.trim()) {
      Alert.alert("Erreur", "Le nom est obligatoire");
      return;
    }
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      Alert.alert("Erreur", "Montant invalide");
      return;
    }

    onSubmit({
      nom: formData.nom.trim(),
      montant: parseFloat(formData.montant),
      description: formData.description.trim(),
      actif: formData.actif
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose}>
          <View style={stylesAssistance.modalOverlay}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={stylesAssistance.modalContentCompact}>
                <View style={stylesAssistance.modalHeader}>
                  <Text style={stylesAssistance.modalTitle}>
                    {initialData ? "Modifier le type" : "Nouveau type d'assistance"}
                  </Text>
                  <TouchableOpacity onPress={onClose} disabled={loading}>
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={stylesAssistance.modalBodyCompact}>
                  <Text style={stylesAssistance.label}>Nom</Text>
                  <TextInput
                    style={stylesAssistance.inputCompact}
                    placeholder="Ex: Mariage"
                    value={formData.nom}
                    onChangeText={(t) => setFormData({ ...formData, nom: t })}
                  />

                  <Text style={stylesAssistance.label}>Montant (FCFA)</Text>
                  <TextInput
                    style={stylesAssistance.inputCompact}
                    placeholder="Ex: 500000"
                    keyboardType="numeric"
                    value={formData.montant}
                    onChangeText={(t) => setFormData({ ...formData, montant: t.replace(/[^0-9]/g, '') })}
                  />

                  <Text style={stylesAssistance.label}>Description</Text>
                  <TextInput
                    style={[stylesAssistance.inputCompact, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="Décrivez cette assistance (facultatif)"
                    multiline
                    numberOfLines={4}
                    value={formData.description}
                    onChangeText={(t) => setFormData({ ...formData, description: t })}
                  />

                  <View style={stylesAssistance.switchRow}>
                    <Text style={stylesAssistance.label}>Actif</Text>
                    <Switch
                      value={formData.actif}
                      onValueChange={(v) => setFormData({ ...formData, actif: v })}
                      trackColor={{ false: COLORS.border, true: COLORS.success }}
                      thumbColor={formData.actif ? COLORS.success : COLORS.textLight}
                    />
                  </View>
                </ScrollView>

                <View style={stylesAssistance.modalFooterCompact}>
                  <TouchableOpacity
                    style={stylesAssistance.buttonSecondary}
                    onPress={onClose}
                    disabled={loading}
                  >
                    <Text style={stylesAssistance.buttonTextSecondary}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[stylesAssistance.buttonPrimary, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={stylesAssistance.buttonTextPrimary}>Enregistrer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};
// 3. Remplacez AssistanceManagerModal par cette version (avec suppression !)
const AssistanceManagerModal = (props: any) => {
  const { visible, onClose, assistanceTypes, onAdd, onEdit, loading } = props;
  
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: COLORS.background || '#F8F9FA', paddingTop: 50 }}>
        
        {/* Header de la Modale */}
        <View style={{
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingHorizontal: 20,
          marginBottom: 10
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.text }}>
            Gestion des Types d'Assistance
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.textSecondary || '#666'} />
          </TouchableOpacity>
        </View>

        {/* Bouton Ajouter */}
        <TouchableOpacity
          style={{
            margin: 20,
            padding: 15,
            backgroundColor: (COLORS.primary || '#007AFF') + '20',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onAdd}
        >
          <Ionicons name="add-circle" size={26} color={COLORS.primary} />
          <Text style={{ marginLeft: 10, color: COLORS.primary, fontSize: 16, fontWeight: 'bold' }}>
            Ajouter un nouveau type
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView style={{ paddingHorizontal: 20 }}>
            {(!assistanceTypes || assistanceTypes.length === 0) ? (
              <Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.textSecondary }}>
                Aucun type d'assistance créé pour l'instant
              </Text>
            ) : (
              assistanceTypes.map((type: any) => (
                <View
                  key={type.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.surface || '#FFF',
                    padding: 15,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderLeftWidth: 5,
                    borderLeftColor: type.actif ? COLORS.success : COLORS.error
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{type.nom}</Text>
                    <Text style={{ color: COLORS.primary, fontSize: 15 }}>
                      {type.montant?.toLocaleString()} FCFA
                    </Text>
                    <Text style={{ fontSize: 12, color: type.actif ? COLORS.success : COLORS.error, marginTop: 4 }}>
                      {type.actif ? "Actif" : "Inactif"}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => onEdit(type)} style={{ padding: 10 }}>
                    <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default function SettingsScreen() {
  const { logout, currentUserQuery } = useAuth();
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useMutuelleConfig();
  const [isTiersExpanded, setIsTiersExpanded] = useState(false);
  // ✅ MUTATIONS
  const updateConfigMutation = useUpdateMutuelleConfig();
  const createExerciseMutation = useCreateNewExercise();
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  // ✅ Appels corrects de vos hooks
  const typesQuery = useAssistanceTypes();
  const createMutation = useCreateAssistance();
  const updateMutation = useUpdateAssistance();
  //const deleteMutation = useDeleteAssistance();
  

// States (remplacez les vôtres)
const [assistanceManagerVisible, setAssistanceManagerVisible] = useState(false);
const [formVisible, setFormVisible] = useState(false);
const [selectedType, setSelectedType] = useState(null);
  

 // Fonctions (remplacez les vôtres)
const handleOpenAdd = () => {
  setSelectedType(null);
  setAssistanceManagerVisible(false);  // ← Ferme la liste
  setFormVisible(true);
};

const handleOpenEdit = (type: any) => {
  setSelectedType(type);
  setAssistanceManagerVisible(false);  // ← Ferme la liste
  setFormVisible(true);
};


//
const handleAssistanceSubmit = async (data) => {
  try {
    const payload = {
      nom: data.nom,
      montant: data.montant,
      actif: data.actif,
      description: data.description || "",
    };

    if (selectedType) {
      await updateMutation.mutateAsync({ id: selectedType.id, payload });
      Alert.alert("Succès", "Type modifié avec succès !");
    } else {
      await createMutation.mutateAsync(payload);
      Alert.alert("Succès", "Nouveau type créé avec succès !");
    }
    setFormVisible(false);
    typesQuery.refetch();
  } catch (error: any) {
    console.log("Erreur détaillée :", error.response?.data);

    let message = "Une erreur est survenue";
    if (error.response?.data) {
      if (error.response.data.nom) message = error.response.data.nom[0];
      if (error.response.data.montant) message = error.response.data.montant[0];
      if (error.response.data.detail) message = error.response.data.detail;
    }

    Alert.alert("Erreur", message);
  }
};

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
// ✅ VRAIE SAUVEGARDE (Config Générale + Tranches locales)
  const handleConfigSave = async (value: string) => {
    if (!currentConfigField) return;
    
    try {
      const parsedValue = currentConfigField.type === "number" 
        ? parseFloat(value.replace(',', '.')) 
        : value;

      // 1️⃣ CAS : Mise à jour d'un coefficient de tranche (Local)
      if (currentConfigField.key.toString().startsWith('tier_')) {
        const index = parseInt(currentConfigField.key.toString().split('_')[1]);
        
        const updatedTiers = [...editableTiers];
        updatedTiers[index] = {
          ...updatedTiers[index],
          coefficient: parsedValue as number
        };
        
        setEditableTiers(updatedTiers);
        setModalVisible(false);
        setCurrentConfigField(null);
        return; // On s'arrête ici car ce n'est pas encore envoyé au backend
      }

      // 2️⃣ CAS : Mise à jour de la configuration générale (Backend)
      const configUpdate = {
        [currentConfigField.key]: parsedValue
      };

      await updateConfigMutation.mutateAsync({
        configUpdates: configUpdate,
        idconf: config?.id || '1'
      });

      Alert.alert(
        "Succès", 
        `${currentConfigField.title} mis à jour avec succès !`,
        [{ text: "OK" }]
      );

      setModalVisible(false);
      setCurrentConfigField(null);

    } catch (error: any) {
      console.error("Erreur sauvegarde config:", error);
      throw error;
    }
  };
const { mutateAsync: upsertTiers } = useUpsertTiers();
// Assure-toi que ce hook est appelé en haut du composant

  const handleExerciseSubmit = async (exerciseData: any) => {
  try {
    console.log("Étape 1: Création de l'exercice...");

    // 1. Créer l'exercice. 
    // On envoie une liste vide [] pour emprunt_tiers pour passer la validation 
    // "champ obligatoire" sans envoyer de dictionnaire (dict)
    const newExercise = await createExerciseMutation.mutateAsync({
      ...exerciseData,
      emprunt_tiers: [] 
    });

    console.log("Étape 2: Exercice créé avec ID:", newExercise.id);
    console.log("Étape 3: Envoi des coefficients...");

    // 2. Préparer les tranches avec l'ID de l'exercice que Django vient de renvoyer
    const tiersWithExerciseId = editableTiers.map(tier => ({
      min_amount: tier.min_amount,
      max_amount: tier.max_amount,
      coefficient: tier.coefficient,
      max_cap: tier.max_cap,
      exercise: newExercise.id // ✅ On lie chaque tranche à l'ID de l'exercice
    }));

    // 3. Envoyer les tranches au backend via le hook upsertTiers
    // (qui boucle sur createEmpruntTier pour faire les POST)
    await upsertTiers(tiersWithExerciseId);

    // ✅ Tout est terminé avec succès
    Alert.alert(
      "Succès", 
      "L'exercice et ses paramêtres ont été configurés avec succès !",
      [{ text: "OK" }]
    );

    setExerciseModalVisible(false);
    refetchConfig(); // Rafraîchir l'affichage global

  } catch (error: any) {
    console.error("Erreur complète du processus:", error);

    let errorMessage = "Une erreur est survenue lors de la configuration.";

    // Extraction propre de l'erreur Django
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        errorMessage = Object.entries(errorData)
          .map(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${field}: ${msg}`;
          })
          .join('\n');
      } else {
        errorMessage = String(errorData);
      }
    }

    Alert.alert("Erreur de configuration", errorMessage);
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
      key: "duree_exercice_mois" as keyof MutuelleConfig,
      title: "Durée exercice",
      value: `${config.duree_exercice_mois} mois`,
      icon: "calendar-outline",
    },
  ] : [];
// À l'intérieur du composant ExerciseModal
const [editableTiers, setEditableTiers] = useState([
  { min_amount: 0, max_amount: 500000, coefficient: 5, max_cap: 2000000 },
  { min_amount: 500001, max_amount: 1000000, coefficient: 4, max_cap: null },
  { min_amount: 1000001, max_amount: 1500000, coefficient: 3, max_cap: null },
  { min_amount: 1500001, max_amount: 2000000, coefficient: 2, max_cap: null },
  { min_amount: 2000001, max_amount: 2500000, coefficient: 1.5, max_cap: null },
]);



// Fonction pour ouvrir le modal de modification d'une tranche
const openTierModal = (index: number) => {
  const tier = editableTiers[index];
  setCurrentConfigField({
    // On utilise un index ou une clé fictive car ce n'est pas dans MutuelleConfig
    key: `tier_${index}` as any, 
    title: `Tranche ${tier.min_amount / 1000}k - ${tier.max_amount / 1000}k`,
    value: tier.coefficient,
    type: "number",
  });
  setModalVisible(true);
};

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
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setAssistanceManagerVisible(true)}
          >
            <View style={styles.settingItemLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="medical-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Types d'Assistance</Text>
                <Text style={styles.settingValue}>Gérer les aides (Mariage, Décès...)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

  {/* Section Coefficients avec le style identique à Configuration Mutuelle */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Coefficients d'emprunt par tranches</Text>
  

{/* Section Coefficients d'emprunt par tranches */}
<View style={styles.section}>
  {/* Header : Style identique aux cartes du haut */}
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={() => setIsTiersExpanded(!isTiersExpanded)}
    activeOpacity={0.7}
  >
    <View style={styles.settingItemLeft}>
      <View style={styles.settingIcon}>
        <Ionicons name="layers-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>Coefficients d'emprunt</Text>
        <Text style={styles.settingValue}>Par tranches de montant</Text>
      </View>
    </View>
    <Ionicons 
      name={isTiersExpanded ? "chevron-up" : "chevron-forward"} 
      size={20} 
      color={COLORS.textSecondary} 
    />
  </TouchableOpacity>

  </View>
  {/* Contenu déroulant : Vos éléments de tranches */}
  {isTiersExpanded && (
    <View style={{ marginTop: 8 }}> 
      {editableTiers.map((tier, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.tierCard} 
          onPress={() => openTierModal(index)}
        >
          <View style={styles.tierInfo}>
            <Text style={styles.tierRange}>
              {tier.min_amount / 1000}k - {tier.max_amount / 1000}k FCFA
            </Text>
            <Text style={styles.tierCoef}>
              Multiplicateur : <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{tier.coefficient}x</Text>
              {tier.max_cap ? ` • Plafond: ${tier.max_cap.toLocaleString()} FCFA` : ''}
            </Text>
          </View>
          <Ionicons name="pencil-outline" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
{/*modif*/}
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
       {/* MODAL 1: Liste des assistances (Le Manager) */}
      <AssistanceManagerModal
        visible={assistanceManagerVisible}
        onClose={() => setAssistanceManagerVisible(false)}
        assistanceTypes={typesQuery.data || []}
        loading={typesQuery.isLoading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        //onDelete={handleDelete}
      />

      {/* MODAL 2: Le Formulaire (Créer/Modifier) - celui créé précédemment */}
      <AssistanceModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        initialData={selectedType}
        onSubmit={handleAssistanceSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tierCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', // Fond légèrement différent du blanc pur du haut
    padding: SPACING.md, 
    borderRadius: BORDER_RADIUS.md, 
    marginBottom: SPACING.sm, 
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.primary, // La barre bleue sur le côté
    // Pas d'ombre (shadow) pour rester plat contrairement aux cartes du haut
  },
  tierInfo: { 
    flex: 1 
  },
  tierRange: { 
    fontSize: FONT_SIZES.md, 
    fontWeight: '700', 
    color: COLORS.text 
  },
  tierCoef: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary, 
    marginTop: 2 
  },
  tierCap: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.primary, 
    fontStyle: 'italic', 
    marginTop: 2 
  },
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
const stylesAssistance = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCompact: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%', // Limite la hauteur
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBodyCompact: {
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputCompact: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalFooterCompact: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  buttonSecondary: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonTextSecondary: {
    color: COLORS.text,
    fontWeight: '600',
  },
  buttonPrimary: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  buttonTextPrimary: {
    color: 'white',
    fontWeight: '700',
  },
  modalBodyCompact: {
  padding: 16,
  maxHeight: 400, // Permet le scroll si trop de contenu
},
});