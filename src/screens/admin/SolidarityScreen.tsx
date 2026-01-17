import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSolidarityPayments, useCreateSolidarityPayment, useSocialFundCurrent } from "../../hooks/useSolidarity";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { SolidarityPayment } from "../../types/solidarity.types";
import { Member } from "../../types/member.types";
import { useNavigation } from "@react-navigation/native";
import { useMutuelleConfig } from "../../hooks/useConfig";


const { width } = Dimensions.get("window");

// 🎯 Types
interface MemberWithProgress {
  id: string;
  numero_membre: string;
  nom_complet: string;
  email: string;
  telephone?: string;
  statut: string;
  montant_paye: number;
  pourcentage_complete: number;
  is_complete: boolean;
  montant_restant: number;
}

interface SolidarityStats {
  total_members: number;
  members_complete: number;
  members_partial: number;
  members_none: number;
  total_collected: number;
  total_expected: number;
  completion_rate: number;
}

// 🎯 Formatage monétaire sécurisé
const formatCurrency = (amount: number | undefined | null): string => {
  if (!amount|| isNaN(amount)) return "0 FCFA";
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};

// 🎯 Composant StatCard
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}

const StatCard = ({ title, value, icon, color, subtitle, onPress }: StatCardProps) => (
  <TouchableOpacity
    style={[styles.statCard, { borderLeftColor: color }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.8 : 1}
    disabled={!onPress}
  >
    <View style={styles.statHeader}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  </TouchableOpacity>
);

// 🎯 Composant MemberCard
interface MemberCardProps {
  member: MemberWithProgress;
  montantAttendu: number;
  onPress: () => void;
}

const MemberCard = ({ member, montantAttendu, onPress }: MemberCardProps) => {
  const getStatusColor = () => {
    if (member.is_complete) return COLORS.success;
    if (member.montant_paye > 0) return COLORS.warning;
    return COLORS.error;
  };

  const getStatusIcon = () => {
    if (member.is_complete) return "checkmark-circle";
    if (member.montant_paye > 0) return "hourglass";
    return "alert-circle";
  };

  const getStatusText = () => {
    if (member.is_complete) return "Solidarité complète";
    if (member.montant_paye > 0) return `Restant: ${formatCurrency(member.montant_restant)}`;
    return "Aucun paiement";
  };

  return (
    <TouchableOpacity
      style={[
        styles.memberCard,
        { 
          borderLeftColor: getStatusColor(),
          opacity: member.is_complete ? 0.7 : 1
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={member.is_complete}
    >
      {/* Header avec avatar et statut */}
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {member.nom_complet.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.nom_complet}</Text>
          <Text style={styles.memberNumber}>{member.numero_membre}</Text>
          {member.email && (
            <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon() as any} size={14} color="white" />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progression</Text>
          <Text style={styles.progressPercentage}>
            {Math.round(member.pourcentage_complete)}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${Math.min(member.pourcentage_complete, 100)}%`,
                backgroundColor: getStatusColor()
              }
            ]} 
          />
        </View>
        <View style={styles.progressAmounts}>
          <Text style={styles.progressPaid}>
            Payé: {formatCurrency(member.montant_paye)}
          </Text>
          <Text style={styles.progressExpected}>
            / {formatCurrency(montantAttendu)}
          </Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusSection}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {!member.is_complete && (
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

// 🎯 Composant principal
export default function SolidarityScreen() {
  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithProgress | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'partial' | 'none'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Hooks de données
  const { data: solidarityPaymentsData, isLoading: loadingSolidarity, isError: errorSolidarity, refetch: refetchSolidarity } = useSolidarityPayments();
  const { data: socialFund, isLoading: loadingFund, isError: errorFund } = useSocialFundCurrent();
  const { data: membersData, isLoading: loadingMembers, isError: errorMembers } = useMembers();
  const { data: currentSession, isLoading: loadingSession, isError: errorSession } = useCurrentSession();
  const { data: currentConfig, isLoading: loadingConfig, isError: errorConfig } = useMutuelleConfig();
  const createSolidarityPayment = useCreateSolidarityPayment();
  const navigation = useNavigation();

  // 🔧 Protection et normalisation des données
  const solidarityPayments: SolidarityPayment[] = useMemo(() => {
    if (Array.isArray(solidarityPaymentsData)) {
      return solidarityPaymentsData;
    }
    if (solidarityPaymentsData && Array.isArray(solidarityPaymentsData.results)) {
      return solidarityPaymentsData.results;
    }
    return [];
  }, [solidarityPaymentsData]);

  const members: Member[] = useMemo(() => {
    if (Array.isArray(membersData)) {
      return membersData;
    }
    if (membersData && Array.isArray(membersData.results)) {
      return membersData.results;
    }
    return [];
  }, [membersData]);

  // Montant attendu par membre pour la session courante
  const montantAttendu = currentConfig?.montant_solidarite || 0;

  // Paiements pour la session courante uniquement
  const sessionSolidarityPayments = useMemo(() => {
    if (!currentSession?.id) return [];
    return solidarityPayments.filter(payment => payment.session === currentSession.id);
  }, [solidarityPayments, currentSession?.id]);

  // Map des montants payés par membre
  const memberPaymentsMap = useMemo(() => {
    const map: Record<string, number> = {};
    sessionSolidarityPayments.forEach(payment => {
      map[payment.membre] = (map[payment.membre] || 0) + (payment.montant || 0);
    });
    return map;
  }, [sessionSolidarityPayments]);

  // Membres avec progression
  const membersWithProgress: MemberWithProgress[] = useMemo(() => {
    return members.map(member => {
      const montantPaye = memberPaymentsMap[member.id] || 0;
      const pourcentageComplete = montantAttendu > 0 ? (montantPaye / montantAttendu) * 100 : 0;
      const isComplete = montantPaye >= montantAttendu && montantAttendu > 0;
      const montantRestant = Math.max(0, montantAttendu - montantPaye);

      return {
        id: member.id,
        numero_membre: member.numero_membre,
        nom_complet: member.utilisateur?.nom_complet || "Nom non disponible",
        email: member.utilisateur?.email || "",
        telephone: member.utilisateur?.telephone,
        statut: member.statut,
        montant_paye: montantPaye,
        pourcentage_complete: pourcentageComplete,
        is_complete: isComplete,
        montant_restant: montantRestant,
      };
    });
  }, [members, memberPaymentsMap, montantAttendu]);

  // Filtrage
  const filteredMembers = useMemo(() => {
    let filtered = membersWithProgress;

    // Filtre par recherche
    if (search.trim()) {
      filtered = filtered.filter(member =>
        [member.nom_complet, member.numero_membre, member.email, member.telephone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    // Filtre par statut
    switch (filterStatus) {
      case 'complete':
        filtered = filtered.filter(m => m.is_complete);
        break;
      case 'partial':
        filtered = filtered.filter(m => !m.is_complete && m.montant_paye > 0);
        break;
      case 'none':
        filtered = filtered.filter(m => m.montant_paye === 0);
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => {
      // Trier par statut puis par nom
      if (a.is_complete !== b.is_complete) {
        return a.is_complete ? 1 : -1; // Complets à la fin
      }
      return a.nom_complet.localeCompare(b.nom_complet);
    });
  }, [membersWithProgress, search, filterStatus]);

  // Statistiques
  const stats: SolidarityStats = useMemo(() => {
    const totalMembers = membersWithProgress.length;
    const membersComplete = membersWithProgress.filter(m => m.is_complete).length;
    const membersPartial = membersWithProgress.filter(m => !m.is_complete && m.montant_paye > 0).length;
    const membersNone = membersWithProgress.filter(m => m.montant_paye === 0).length;
    const totalCollected = membersWithProgress.reduce((sum, m) => sum + m.montant_paye, 0);
    const totalExpected = totalMembers * montantAttendu;
    const completionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    return {
      total_members: totalMembers,
      members_complete: membersComplete,
      members_partial: membersPartial,
      members_none: membersNone,
      total_collected: totalCollected,
      total_expected: totalExpected,
      completion_rate: completionRate,
    };
  }, [membersWithProgress, montantAttendu]);

  // Actions
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSolidarity(),
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    }
    setRefreshing(false);
  };

  const handleMemberPress = (member: MemberWithProgress) => {
    if (member.is_complete) return;
    
    setSelectedMember(member);
    setPaymentAmount(member.montant_restant > 0 ? member.montant_restant.toString() : "");
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleCreatePayment = () => {
    if (!selectedMember) {
      Alert.alert("Erreur", "Aucun membre sélectionné.");
      return;
    }

    if (!paymentAmount.trim() || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un montant valide.");
      return;
    }

    if (!currentSession?.id) {
      Alert.alert("Erreur", "Aucune session courante disponible.");
      return;
    }

    const montant = Number(paymentAmount);
    if (montant > selectedMember.montant_restant * 2) {
      Alert.alert(
        "Confirmation",
        `Le montant saisi (${formatCurrency(montant)}) est supérieur au montant restant (${formatCurrency(selectedMember.montant_restant)}). Continuer ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Continuer", onPress: createPayment }
        ]
      );
    } else {
      createPayment();
    }
  };

  const createPayment = () => {
    if (!selectedMember || !currentSession?.id) return;

    createSolidarityPayment.mutate(
      {
        membre: selectedMember.id,
        session: currentSession.id,
        montant: Number(paymentAmount),
        notes: paymentNotes.trim(),
      },
      {
        onSuccess: () => {
          setShowPaymentModal(false);
          setSelectedMember(null);
          setPaymentAmount("");
          setPaymentNotes("");
          Alert.alert("Succès", "Paiement de solidarité enregistré avec succès !");
        },
        onError: (error: any) => {
          console.error("Erreur création paiement:", error);
          Alert.alert(
            "Erreur",
            error?.response?.data?.details || 
            error?.response?.data?.error || 
            "Impossible d'enregistrer le paiement."
          );
        },
      }
    );
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedMember(null);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  // État de chargement global
  const isLoading = loadingSolidarity || loadingMembers || loadingSession || loadingFund;
  const hasError = errorSolidarity || errorMembers || errorSession || errorFund;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[{ type: 'content' }]}
        keyExtractor={() => 'main-content'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={() => (
          <View>
            {/* Header avec gradient */}
            <LinearGradient
              colors={["#059669", "#10B981"]}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
              <View style={styles.headerContent}>
                <Ionicons name="wallet" size={32} color="white" style={styles.headerIcon} />
                <Text style={styles.headerTitle}>Gestion des Solidarités</Text>
                <Text style={styles.headerSubtitle}>
                  Session: {currentSession?.nom || "Chargement..."}
                </Text>
                {montantAttendu > 0 && (
                  <Text style={styles.headerAmount}>
                    Montant attendu: {formatCurrency(montantAttendu)}
                  </Text>
                )}
              </View>
            </LinearGradient>

            {/* Section fonds social */}
            <View style={styles.fundSection}>
              <View style={styles.fundCard}>
                <Ionicons name="heart" size={24} color="#059669" />
                <View style={styles.fundInfo}>
                  <Text style={styles.fundLabel}>Fonds Social Disponible</Text>
                  <Text style={styles.fundAmount}>
                    {loadingFund ? "Chargement..." : formatCurrency(socialFund?.montant_total)}
                  </Text>
                </View>

              </View>
              <StatCard
                  title="Solidarités complètes"
                  value={stats.members_complete.toString()}
                  icon="checkmark-circle"
                  color={COLORS.success}
                />
            </View>
            {/* Section recherche et filtres */}
            <View style={styles.searchSection}>
              <View style={styles.searchHeader}>
                <Text style={styles.sectionTitle}>
                  Membres ({filteredMembers.length})
                </Text>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher un membre..."
                  placeholderTextColor={COLORS.textLight}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtres de statut */}
              <View style={styles.filtersContainer}>
                {[
                  { key: 'all', label: 'Tous', count: stats.total_members },
                  { key: 'complete', label: 'Complets', count: stats.members_complete },
                  { key: 'partial', label: 'Partiels', count: stats.members_partial },
                  { key: 'none', label: 'Aucun', count: stats.members_none },
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      { backgroundColor: filterStatus === filter.key ? COLORS.primary : COLORS.surface }
                    ]}
                    onPress={() => setFilterStatus(filter.key as any)}
                  >
                    <Text style={[
                      styles.filterText,
                      { color: filterStatus === filter.key ? 'white' : COLORS.text }
                    ]}>
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* États de chargement/erreur */}
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement des données...</Text>
              </View>
            ) : hasError ? (
              <View style={styles.centerContainer}>
                <Ionicons name="alert-circle" size={64} color={COLORS.error} />
                <Text style={styles.errorTitle}>Erreur de chargement</Text>
                <Text style={styles.errorText}>
                  Impossible de charger les données de solidarité.
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucun membre trouvé</Text>
                <Text style={styles.emptyText}>
                  {search ? "Aucun résultat pour votre recherche." : "Aucun membre disponible."}
                </Text>
              </View>
            ) : (
              // Liste des membres
              <View style={styles.membersListContainer}>
                {filteredMembers.map((member, index) => (
                  <View key={member.id} style={{ marginBottom: SPACING.md }}>
                    <MemberCard
                      member={member}
                      montantAttendu={montantAttendu}
                      onPress={() => handleMemberPress(member)}
                    />
                  </View>
                ))}
                <View style={{ height: SPACING.xxl }} />
              </View>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de paiement */}
      <Modal 
        visible={showPaymentModal} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={["#059669", "#10B981"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nouveau Paiement Solidarité</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {/* Informations membre */}
              <View style={styles.memberInfoSection}>
                <View style={styles.memberModalAvatar}>
                  <Text style={styles.memberModalAvatarText}>
                    {selectedMember?.nom_complet.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberModalInfo}>
                  <Text style={styles.memberModalName}>{selectedMember?.nom_complet}</Text>
                  <Text style={styles.memberModalNumber}>{selectedMember?.numero_membre}</Text>
                </View>
              </View>

              {/* Progression actuelle */}
              <View style={styles.currentProgressSection}>
                <Text style={styles.currentProgressTitle}>Progression actuelle</Text>
                <View style={styles.currentProgressRow}>
                  <Text style={styles.currentProgressLabel}>Payé:</Text>
                  <Text style={styles.currentProgressValue}>
                    {formatCurrency(selectedMember?.montant_paye)}
                  </Text>
                </View>
                <View style={styles.currentProgressRow}>
                  <Text style={styles.currentProgressLabel}>Attendu:</Text>
                  <Text style={styles.currentProgressValue}>
                    {formatCurrency(montantAttendu)}
                  </Text>
                </View>
                <View style={styles.currentProgressRow}>
                  <Text style={styles.currentProgressLabel}>Restant:</Text>
                  <Text style={[styles.currentProgressValue, { color: COLORS.error }]}>
                    {formatCurrency(selectedMember?.montant_restant)}
                  </Text>
                </View>
              </View>

              {/* Formulaire */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>
                  Montant <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Montant en FCFA"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />

                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="Notes sur ce paiement..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.confirmButton,
                    { 
                      opacity: (!paymentAmount.trim() || createSolidarityPayment.isPending) ? 0.5 : 1 
                    }
                  ]}
                  onPress={handleCreatePayment}
                  disabled={!paymentAmount.trim() || createSolidarityPayment.isPending}
                >
                  {createSolidarityPayment.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    alignItems: "center",
  },
  headerIcon: {
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  headerAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },

  // Fonds social
  fundSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  fundCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fundInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  fundLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  fundAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "#059669",
  },

  // Sections
  statsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  membersListContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  // Stats
  statsGrid: {
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop:10,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
  },
  statSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Search
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },

  // Filters
  filtersContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Member Card
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  memberAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  memberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  memberEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Progress
  progressSection: {
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  progressPercentage: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressPaid: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  progressExpected: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Status
  statusSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Center Container
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
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
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },

  // Member Info in Modal
  memberInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    marginTop:SPACING.lg,
  },

  memberModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  memberModalAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  memberModalInfo: {
    flex: 1,
  },
  memberModalName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  memberModalNumber: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },

  // Current Progress
  currentProgressSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentProgressTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  currentProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  currentProgressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  currentProgressValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },

  // Form
  formSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginBottom:SPACING.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: "#059669",
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
});