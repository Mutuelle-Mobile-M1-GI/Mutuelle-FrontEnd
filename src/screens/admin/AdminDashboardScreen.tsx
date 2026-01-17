import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuthContext } from "../../context/AuthContext";
import { useAdminDashboard } from "../../hooks/useDashboard";
import { useMutuelleConfig } from "../../hooks/useConfig";
import { useNavigation } from "@react-navigation/native";
// ✅ AJOUTER ces imports
import { useCurrentExercise, useCurrentSession } from "../../hooks/useExercise";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateNewSession } from "../../hooks/useSession";


const { width } = Dimensions.get("window");

// 🎯 Type pour les modules de navigation
interface NavigationModule {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradientColors: [string, string];
  route: string;
  isMain?: boolean;
}

// 🎯 Modal de Nouvelle Session
interface NewSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}

const NewSessionModal = ({ visible, onClose, onSubmit, loading }: NewSessionModalProps) => {
  const [formData, setFormData] = useState({
    nom: "",
    date_session: new Date().toISOString().split('T')[0],
    montant_collation: "45000",
  });

  const handleSubmit = () => {
   
    onSubmit(formData);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle Session</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nom de la session</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Session Janvier 2025"
              value={formData.nom}
              onChangeText={(text) => setFormData({ ...formData, nom: text })}
            />

            <Text style={styles.inputLabel}>Date de session</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.date_session}
              onChangeText={(text) => setFormData({ ...formData, date_session: text })}
            />

            <Text style={styles.inputLabel}>Montant collation (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="45000"
              value={formData.montant_collation}
              onChangeText={(text) => setFormData({ ...formData, montant_collation: text })}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Montant par défaut: 45,000 FCFA</Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
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
                <Text style={styles.submitButtonText}>Créer Session</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const { data: dashboardData, isLoading, error, refetch } = useAdminDashboard();
  const { data: config } = useMutuelleConfig();
   // ✅ AJOUTER cette ligne
   const queryClient = useQueryClient();
   // ✅ AJOUTER cette mutation
  const createSessionMutation = useCreateNewSession();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
   // ✅ CORRIGER : Utiliser la mutation au lieu du state local
   const sessionLoading = createSessionMutation.isPending;
   // ✅ AJOUTER ces hooks ici
   const { data: currentExercise, isLoading: exerciseLoading } = useCurrentExercise();
   const { data: currentSession, isLoading: sessionLoading2 } = useCurrentSession();

  // 🎯 Modules de navigation organisés en grille
  const navigationModules: NavigationModule[] = [
    {
      id: "inscriptions",
      title: "Inscriptions",
      subtitle: "Gérer les inscriptions",
      icon: "person-add",
      color: "#4361EE",
      gradientColors: ["#4361EE", "#3A86FF"],
      route: "InscriptionsScreen",
      isMain: true,
    },
    {
      id: "solidarite",
      title: "Solidarité",
      subtitle: "Fonds social",
      icon: "heart",
      color: "#38A3A5",
      gradientColors: ["#38A3A5", "#57CC99"],
      route: "SolidarityScreen",
      isMain: true,
    },
    {
      id: "epargne",
      title: "Épargne",
      subtitle: "Gestion des épargnes",
      icon: "wallet",
      color: "#B5179E",
      gradientColors: ["#B5179E", "#F72585"],
      route: "SavingsScreen",
      isMain: true,
    },
    {
      id: "emprunts",
      title: "Emprunts",
      subtitle: "Prêts et crédits",
      icon: "card",
      color: "#F77F00",
      gradientColors: ["#F77F00", "#FCBF49"],
      route: "LoansScreen",
      isMain: true,
    },
    {
      id: "assistances",
      title: "Assistances",
      subtitle: "Aides et soutiens",
      icon: "medical",
      color: "#7209B7",
      gradientColors: ["#7209B7", "#A663CC"],
      route: "AssistanceScreen",
    },
    {
      id: "remboursements",
      title: "Remboursements",
      subtitle: "Suivi des retours",
      icon: "repeat",
      color: "#06FFA5",
      gradientColors: ["#06FFA5", "#0EAD69"],
      route: "RepaymentsScreen",
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
       // ✅ AJOUTER ces lignes pour refresh les nouvelles données
    queryClient.invalidateQueries({ queryKey: ["current-exercise"] });
    queryClient.invalidateQueries({ queryKey: ["current-session"] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSession = async (sessionData: any) => {
    try {
      // Validation

      // Préparer les données
      const apiData = {
        nom: sessionData.nom.trim(),
        date_session: sessionData.date_session,
        montant_collation: parseFloat(sessionData.montant_collation) || 45000,
        description: `Session créée le ${new Date().toLocaleDateString('fr-FR')}`,
        exercice: currentExercise.id

      };

      console.log("📤 Création session:", apiData);

      // ✅ Appel de la vraie mutation
      await createSessionMutation.mutateAsync(apiData);

      Alert.alert("Succès", "Session créée avec succès !");
      setShowSessionModal(false);
      
    } catch (error: any) {
      console.error("❌ Erreur création session:", error);
      
      let errorMessage = "Impossible de créer la session";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          errorMessage = errorMessages || errorMessage;
        }
      }
      
      Alert.alert("Erreur", errorMessage);
    }
  };

  const handleModulePress = (moduleId: string, route: string) => {
    console.log(`Navigation vers ${moduleId}`);
    navigation.navigate(route);
  };

  // 📊 Calculs des statistiques affichées
  const stats = React.useMemo(() => {
    if (!dashboardData) return null;
    
    return {
      membres: dashboardData.tresor?.nombre_membres || 0,
      fondsTotal: dashboardData.fonds_social?.montant_total || 0,
      epargneTotal: dashboardData.tresor?.cumul_total_epargnes || 0,
      empruntsEnCours: dashboardData.emprunts_en_cours?.nombre || 0,
      alertesCount: dashboardData.alertes?.length || 0,
    };
  }, [dashboardData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorText}>
          Impossible de charger les données du tableau de bord
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.nom_complet || 
                   (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null) ||
                   user?.username || 
                   user?.email?.split('@')[0] || 
                   "Administrateur";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 🎯 Header moderne */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userRole}>Administrateur</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
              {(stats?.alertesCount || 0) > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {(stats?.alertesCount || 0) > 9 ? "9+" : stats?.alertesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate("Profile")}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 📊 Statistiques rapides */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: "#4361EE15" }]}>
                <Ionicons name="people" size={24} color="#4361EE" />
                <Text style={[styles.statValue, { color: "#4361EE" }]}>
                  {stats.membres}
                </Text>
                <Text style={styles.statLabel}>Membres</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: "#38A3A515" }]}>
                <Ionicons name="cash" size={24} color="#38A3A5" />
                <Text style={[styles.statValue, { color: "#38A3A5" }]}>
                  {(stats.fondsTotal / 1000).toFixed(1)}K
                </Text>
                <Text style={styles.statLabel}>Fonds Social</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: "#B5179E15" }]}>
                <Ionicons name="trending-up" size={24} color="#B5179E" />
                <Text style={[styles.statValue, { color: "#B5179E" }]}>
                  {(stats.epargneTotal / 1000).toFixed(1)}K
                </Text>
                <Text style={styles.statLabel}>Épargnes</Text>
              </View>
            </View>
          </View>
        )}
        
{/* ✅ AJOUTER CETTE NOUVELLE SECTION ICI */}
{/* 🏢 Informations exercice et session */}
<View style={styles.exerciseSessionContainer}>
  <Text style={styles.sectionTitle}>Exercice & Session</Text>
  
  <View style={styles.exerciseSessionGrid}>
    {/* Exercice en cours */}
    <View style={[styles.exerciseSessionCard, { backgroundColor: "#4361EE15" }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="calendar" size={20} color="#4361EE" />
        <Text style={[styles.cardTitle, { color: "#4361EE" }]}>Exercice</Text>
      </View>
      
      {exerciseLoading ? (
        <ActivityIndicator size="small" color="#4361EE" />
      ) : currentExercise ? (
        <View style={styles.cardContent}>
          <Text style={styles.cardMainText}>{currentExercise.nom}</Text>
          <Text style={styles.cardSubText}>
            {new Date(currentExercise.date_debut).toLocaleDateString('fr-FR')} - {' '}
            {currentExercise.date_fin 
              ? new Date(currentExercise.date_fin).toLocaleDateString('fr-FR')
              : "En cours"
            }
          </Text>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusBadgeText, { color: "#4361EE" }]}>
              {currentExercise.statut}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.cardContent}>
          <Text style={styles.cardEmptyText}>Aucun exercice en cours</Text>
         
        </View>
      )}
    </View>

    {/* Session actuelle */}
    <View style={[styles.exerciseSessionCard, { backgroundColor: "#38A3A515" }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="people" size={20} color="#38A3A5" />
        <Text style={[styles.cardTitle, { color: "#38A3A5" }]}>Session</Text>
      </View>
      
      {sessionLoading2 ? (
        <ActivityIndicator size="small" color="#38A3A5" />
      ) : currentSession ? (
        <View style={styles.cardContent}>
          <Text style={styles.cardMainText}>{currentSession.nom}</Text>
          <Text style={styles.cardSubText}>
            {new Date(currentSession.date_session).toLocaleDateString('fr-FR')}
          </Text>
          <View style={styles.sessionStats}>
            <Text style={styles.sessionStatsText}>
              {currentSession.nombre_membres_inscrits || 0} membres
            </Text>
            <Text style={styles.sessionStatsText}>
              {((currentSession.total_solidarite_collectee || 0) / 1000).toFixed(0)}k FCFA
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.cardContent}>
          <Text style={styles.cardEmptyText}>Aucune session active</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowSessionModal(true)}
          >
            <Text style={styles.createButtonText}>Créer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
</View>


        {/* 🎯 Grille des modules principaux */}
        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>Gestion Mutuelle</Text>
          <View style={styles.modulesGrid}>
            {navigationModules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={[
                  styles.moduleCard,
                  module.isMain && styles.moduleCardMain
                ]}
                onPress={() => handleModulePress(module.id, module.route)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={module.gradientColors}
                  style={styles.moduleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.moduleContent}>
                    <Ionicons name={module.icon as any} size={28} color="white" />
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🎯 Action principale - Nouvelle Session */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.newSessionButton}
            onPress={() => setShowSessionModal(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#4361EE", "#3A86FF"]}
              style={styles.newSessionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.newSessionText}>Nouvelle Session</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 🚨 Alertes importantes */}
        {dashboardData?.alertes && dashboardData.alertes.length > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.sectionTitle}>Alertes</Text>
            {dashboardData.alertes.slice(0, 3).map((alerte, index) => (
              <View key={index} style={styles.alertCard}>
                <Ionicons
                  name={alerte.priorite === "HAUTE" ? "warning" : "information-circle"}
                  size={20}
                  color={alerte.priorite === "HAUTE" ? COLORS.error : COLORS.warning}
                />
                <Text style={styles.alertText}>{alerte.message}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal Nouvelle Session */}
      <NewSessionModal
        visible={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSubmit={handleCreateSession}
        loading={sessionLoading}
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  errorTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.error,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: FONT_SIZES.md,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userRole: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
  },

  // Statistiques
  statsContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 16.5,
    fontWeight: "bold",
    marginVertical: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // Modules
  modulesContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  moduleCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    height: 120,
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  moduleCardMain: {
    height: 140,
  },
  moduleGradient: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: "center",
  },
  moduleContent: {
    alignItems: "center",
  },
  moduleTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  moduleSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: "rgba(255,255,255,0.8)",
    marginTop: SPACING.xs,
    textAlign: "center",
  },

  // Action principale
  actionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  newSessionButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newSessionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  newSessionText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
  },

  // Alertes
  alertsContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: width - SPACING.lg * 2,
    maxHeight: "80%",
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
  
  // ✅ AJOUTER ces nouveaux styles
  exerciseSessionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  exerciseSessionGrid: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  exerciseSessionCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  cardContent: {
    flex: 1,
  },
  cardMainText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSubText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  cardEmptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryWithOpacity(0.1),
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "500",
  },
  sessionStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionStatsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "center",
  },
  createButtonText: {
    fontSize: FONT_SIZES.xs,
    color: "white",
    fontWeight: "600",
  },
});