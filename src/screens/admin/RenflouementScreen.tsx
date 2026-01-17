import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRenflouements, useRenflouementStats, useCreateRenflouementPayment } from "../../hooks/useRenflouement";
import { Renflouement, RenflouementPayment } from "../../types/renflouement.types";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";

const { width } = Dimensions.get("window");

// 🎯 Type pour le modal
type ModalState = boolean | string;

// 🎯 Formatage monétaire sécurisé
const formatCurrency = (amount: number | undefined | null): string => {
  if ( isNaN(amount)) return "0 FCFA";
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
}

const StatCard = ({ title, value, icon, color, subtitle }: StatCardProps) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
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
  </View>
);

// 🎯 Composant RenflouementCard
interface RenflouementCardProps {
  item: Renflouement;
  onPayment: (item: Renflouement) => void;
  onDetails: (item: Renflouement) => void;
}

const RenflouementCard = ({ item, onPayment, onDetails }: RenflouementCardProps) => (
  <View style={[
    styles.renflouementCard,
    { borderLeftColor: item.is_solde ? COLORS.success : COLORS.warning }
  ]}>
    {/* Header avec status badge */}
    <View style={styles.cardHeader}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.membre_info?.nom_complet || "Nom indisponible"}
        </Text>
        <Text style={styles.memberNumber}>
          {item.membre_info?.numero_membre || "N/A"}
        </Text>
      </View>
      <View style={[
        styles.statusBadge,
        { backgroundColor: item.is_solde ? COLORS.success : COLORS.warning }
      ]}>
        <Text style={styles.statusText}>
          {item.is_solde ? "Soldé" : "En cours"}
        </Text>
      </View>
    </View>

    {/* Informations financières */}
    <View style={styles.financialInfo}>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Montant dû:</Text>
        <Text style={styles.financialValue}>{formatCurrency(item.montant_du)}</Text>
      </View>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Déjà payé:</Text>
        <Text style={[styles.financialValue, { color: COLORS.success }]}>
          {formatCurrency(item.montant_paye)}
        </Text>
      </View>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Reste à payer:</Text>
        <Text style={[styles.financialValue, { 
          color: (item.montant_restant || 0) > 0 ? COLORS.error : COLORS.success 
        }]}>
          {formatCurrency(item.montant_restant)}
        </Text>
      </View>
    </View>

    {/* Progress bar */}
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressBar, 
          { 
            width: `${item.pourcentage_paye || 0}%`,
            backgroundColor: item.is_solde ? COLORS.success : COLORS.warning
          }
        ]} />
      </View>
      <Text style={styles.progressText}>{item.pourcentage_paye || 0}% payé</Text>
    </View>

    {/* Détails cause et session */}
    <View style={styles.detailsInfo}>
      <View style={styles.detailRow}>
        <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{item.session_nom || "Session N/A"}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{item.cause || item.type_cause_display || "Cause N/A"}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="time" size={16} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>
          {item.date_creation ? new Date(item.date_creation).toLocaleDateString('fr-FR') : "Date N/A"}
        </Text>
      </View>
    </View>

    {/* Paiements récents */}
    {item.paiements_details && item.paiements_details.length > 0 && (
      <View style={styles.recentPayments}>
        <Text style={styles.recentPaymentsTitle}>Paiements récents:</Text>
        {item.paiements_details.slice(0, 2).map((payment) => (
          <View key={payment.id} style={styles.paymentRow}>
            <Text style={styles.paymentAmount}>
              {formatCurrency(payment.montant)}
            </Text>
            <Text style={styles.paymentDate}>
              {payment.date_paiement ? new Date(payment.date_paiement).toLocaleDateString('fr-FR') : "N/A"}
            </Text>
          </View>
        ))}
      </View>
    )}

    {/* Actions */}
    <View style={styles.cardActions}>
      <TouchableOpacity
        style={[styles.actionButton, styles.detailsButton]}
        onPress={() => onDetails(item)}
      >
        <Ionicons name="eye" size={18} color={COLORS.primary} />
        <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
          Détails
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.paymentButton,
          { opacity: item.is_solde ? 0.5 : 1 }
        ]}
        onPress={() => onPayment(item)}
        disabled={item.is_solde}
      >
        <Ionicons name="card" size={18} color="white" />
        <Text style={styles.paymentButtonText}>
          {item.is_solde ? "Soldé" : "Paiement"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

// 🎯 Composant principal
export default function RenflouementScreen() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState<ModalState>(false);
  const [currentRenflouement, setCurrentRenflouement] = useState<Renflouement | null>(null);
  const [montant, setMontant] = useState("");
  const [notes, setNotes] = useState("");

  // Hooks
  const { data: stats, isLoading: loadingStats } = useRenflouementStats();
  const { data: renflouementsData, isLoading, isError, refetch } = useRenflouements();
  const createPayment = useCreateRenflouementPayment();

  // 🔧 Protection des données avec types corrects
  const renflouements: Renflouement[] = useMemo(() => {
    if (Array.isArray(renflouementsData)) {
      return renflouementsData;
    }
    if (renflouementsData && Array.isArray(renflouementsData.results)) {
      return renflouementsData.results;
    }
    return [];
  }, [renflouementsData]);

  // Filtrage sécurisé
  const filteredRenflouements = useMemo(() => {
    if (!search.trim()) return renflouements;
    
    return renflouements.filter((item) => {
      const searchFields = [
        item?.membre_info?.nom_complet,
        item?.membre_info?.numero_membre,
        item?.membre_info?.email,
        item?.session_nom,
        item?.cause,
        item?.type_cause_display,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return searchFields.includes(search.toLowerCase());
    });
  }, [renflouements, search]);

  // Actions
  const openPaymentModal = (renflouement: Renflouement) => {
    setCurrentRenflouement(renflouement);
    setMontant("");
    setNotes("");
    setShowModal(true);
  };

  const openDetailsModal = (renflouement: Renflouement) => {
    setCurrentRenflouement(renflouement);
    setShowModal(`details-${renflouement.id}`);
  };

  const handleAddPayment = () => {
    const montantNum = Number(montant);
    if (!montant || isNaN(montantNum) || montantNum <= 0) {
      Alert.alert("Erreur", "Montant invalide.");
      return;
    }
    if (!currentRenflouement) return;

    createPayment.mutate(
      {
        renflouement: currentRenflouement.id,
        montant: montantNum,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setMontant("");
          setNotes("");
          setCurrentRenflouement(null);
          refetch();
          Alert.alert("Succès", "Paiement ajouté avec succès !");
        },
        onError: (err: any) => {
          Alert.alert(
            "Erreur",
            err?.response?.data?.error || "Impossible d'ajouter le paiement."
          );
        },
      }
    );
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentRenflouement(null);
    setMontant("");
    setNotes("");
  };

  // Render des paiements pour le modal détails
  const renderPaymentItem: ListRenderItem<RenflouementPayment> = ({ item }) => (
    <View style={styles.paymentDetailCard}>
      <View style={styles.paymentDetailHeader}>
        <Text style={styles.paymentDetailAmount}>
          {formatCurrency(item.montant)}
        </Text>
        <Text style={styles.paymentDetailDate}>
          {item.date_paiement ? new Date(item.date_paiement).toLocaleDateString('fr-FR') : "N/A"}
        </Text>
      </View>
      <Text style={styles.paymentDetailSession}>
        Session: {item.session_nom || "N/A"}
      </Text>
      {item.notes && (
        <Text style={styles.paymentDetailNotes}>
          Note: {item.notes}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[COLORS.primary, "#3A86FF"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Gestion des Renflouements</Text>
        <Text style={styles.headerSubtitle}>
          Suivi des paiements de renflouement
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section statistiques */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistiques globales</Text>
          {loadingStats ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : (
            <View style={styles.statsGrid}>
              <StatCard
                title="Total dû"
                value={formatCurrency(stats?.montants?.total_du)}
                icon="wallet-outline"
                color={COLORS.error}
              />
              <StatCard
                title="Total payé"
                value={formatCurrency(stats?.montants?.total_paye)}
                icon="checkmark-circle"
                color={COLORS.success}
              />
              <StatCard
                title="Taux recouvrement"
                value={`${stats?.pourcentages?.taux_recouvrement?.toFixed(1) || 0}%`}
                icon="analytics"
                color={COLORS.primary}
              />
            </View>
          )}
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>
            Renflouements ({filteredRenflouements.length})
          </Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher par nom, session, cause..."
              placeholderTextColor={COLORS.textLight}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Liste des renflouements */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement des renflouements...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color={COLORS.error} />
            <Text style={styles.errorTitle}>Erreur de chargement</Text>
            <Text style={styles.errorText}>
              Impossible de charger les renflouements.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : filteredRenflouements.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="document-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucun renflouement</Text>
            <Text style={styles.emptyText}>
              {search ? "Aucun résultat pour votre recherche." : "Aucun renflouement enregistré."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRenflouements}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RenflouementCard
                item={item}
                onPayment={openPaymentModal}
                onDetails={openDetailsModal}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          />
        )}

        <View style={{height:70}}></View>
      </ScrollView>

      {/* Modal Paiement */}
      <Modal 
        visible={showModal === true} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[COLORS.primary, "#3A86FF"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nouveau Paiement</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.memberInfoSection}>
                <Text style={styles.modalMemberName}>
                  {currentRenflouement?.membre_info?.nom_complet}
                </Text>
                <Text style={styles.modalMemberNumber}>
                  {currentRenflouement?.membre_info?.numero_membre}
                </Text>
              </View>

              <View style={styles.modalFinancialInfo}>
                <View style={styles.modalFinancialRow}>
                  <Text style={styles.modalFinancialLabel}>Montant dû:</Text>
                  <Text style={styles.modalFinancialValue}>
                    {formatCurrency(currentRenflouement?.montant_du)}
                  </Text>
                </View>
                <View style={styles.modalFinancialRow}>
                  <Text style={styles.modalFinancialLabel}>Reste à payer:</Text>
                  <Text style={[styles.modalFinancialValue, { color: COLORS.error }]}>
                    {formatCurrency(currentRenflouement?.montant_restant)}
                  </Text>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Montant du paiement *</Text>
                <TextInput
                  style={styles.input}
                  value={montant}
                  onChangeText={setMontant}
                  placeholder="Entrez le montant en FCFA"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ajouter une note..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAddPayment}
                  disabled={createPayment.isPending}
                >
                  {createPayment.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Valider</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Détails */}
      <Modal
        visible={
          typeof showModal === "string" &&
          showModal.startsWith("details-") &&
          !!currentRenflouement
        }
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[COLORS.primary, "#3A86FF"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Historique des Paiements</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.memberInfoSection}>
                <Text style={styles.modalMemberName}>
                  {currentRenflouement?.membre_info?.nom_complet}
                </Text>
                <Text style={styles.modalMemberNumber}>
                  {currentRenflouement?.membre_info?.numero_membre}
                </Text>
              </View>

              <View style={styles.paymentsListContainer}>
                {currentRenflouement?.paiements_details && currentRenflouement.paiements_details.length > 0 ? (
                  <FlatList
                    data={currentRenflouement.paiements_details}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPaymentItem}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
                  />
                ) : (
                  <View style={styles.emptyPayments}>
                    <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
                    <Text style={styles.emptyPaymentsText}>
                      Aucun paiement enregistré
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  // Sections
  statsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
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
    borderWidth: 0,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },

  // Renflouement Card
  renflouementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical:SPACING.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
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
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: "white",
  },

  // Financial Info
  financialInfo: {
    marginBottom: SPACING.md,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  financialLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },

  // Progress
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "right",
  },

  // Details Info
  detailsInfo: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Recent Payments
  recentPayments: {
    backgroundColor: COLORS.shadowLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  recentPaymentsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  paymentAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.success,
  },
  paymentDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Card Actions
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  detailsButton: {
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  paymentButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  paymentButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: "white",
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
  loader: {
    marginVertical: SPACING.lg,
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
    height: "60%",
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
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  // Member Info in Modal
  memberInfoSection: {
    backgroundColor: COLORS.shadowLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalMemberName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalMemberNumber: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },

  // Financial Info in Modal
  modalFinancialInfo: {
    marginBottom: SPACING.lg,
  },
  modalFinancialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  modalFinancialLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  modalFinancialValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },

  // Input Section
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
    marginTop: SPACING.lg,
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
    backgroundColor: COLORS.shadowLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
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

  // Payment Details
  paymentsListContainer: {
    flex: 1,
  },
  paymentDetailCard: {
    backgroundColor: COLORS.shadowLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  paymentDetailAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.success,
  },
  paymentDetailDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  paymentDetailSession: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  paymentDetailNotes: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: "italic",
  },
  emptyPayments: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },
  emptyPaymentsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});