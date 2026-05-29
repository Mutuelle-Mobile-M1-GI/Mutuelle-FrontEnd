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
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRenflouements, useRenflouementStats, useCreateRenflouementPayment, usePayRenflouementWithSavings } from "../../hooks/useRenflouement";
import { Renflouement, RenflouementPayment } from "../../types/renflouement.types";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuthContext } from "../../context/AuthContext";
const { width } = Dimensions.get("window");
// 🎯 Configuration de la pagination
const ITEMS_PER_PAGE = 10;

// 🎯 Type pour le modal
type ModalState = boolean | "payment" | "savings" | string;

// 🎯 Formatage monétaire sécurisé
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 FCFA";
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
  onPaymentWithSavings: (item: Renflouement) => void;  // ←
}

const RenflouementCard = ({ item, onPayment, onDetails, onPaymentWithSavings, readOnly }: RenflouementCardProps & { readOnly?: boolean }) => (
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
      
      {!readOnly && (
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
      )}

      {!readOnly && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.savingsButton,
            { opacity: item.is_solde ? 0.5 : 1 }
          ]}
          onPress={() => onPaymentWithSavings(item)}
          disabled={item.is_solde}
          activeOpacity={0.7}
        >
          <Ionicons name="wallet-outline" size={18} color="white" />
          <Text style={styles.savingsButtonText}>Payer avec épargne</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// 🎯 Composant principal
export default function RenflouementScreen() {
  const { user } = useAuthContext();
  const readOnly = !user?.can_write;
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState<ModalState>(false);
  const [modalType, setModalType] = useState<"payment" | "savings" | null>(null);
  const [currentRenflouement, setCurrentRenflouement] = useState<Renflouement | null>(null);
  const [montant, setMontant] = useState("");
  const [notes, setNotes] = useState("");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const [filterStatus, setFilterStatus] = useState<'all' | 'solde' | 'en-cours'>('all');

  // Hooks
  const { data: stats, isLoading: loadingStats } = useRenflouementStats();
  const { data: renflouementsData, isLoading, isError, refetch } = useRenflouements();
  const createPayment = useCreateRenflouementPayment();
  const payWithSavings = usePayRenflouementWithSavings();

  // 🔧 Protection des données avec types corrects
  const renflouements: Renflouement[] = useMemo(() => {
    if (Array.isArray(renflouementsData)) {
      return renflouementsData;
    }
    if (renflouementsData && Array.isArray((renflouementsData as any).results)) {
      return (renflouementsData as any).results;
    }
    return [];
  }, [renflouementsData]);

  // Filtrage sécurisé (membres uniquement)
  const filteredRenflouements = useMemo(() => {
    let filtered = renflouements;

    // Filtrage par statut
    if (filterStatus === 'solde') {
      filtered = filtered.filter(item => item.is_solde);
    } else if (filterStatus === 'en-cours') {
      filtered = filtered.filter(item => !item.is_solde);
    }

    // Filtrage par recherche (membres uniquement)
    if (!search.trim()) return filtered;
    
    return filtered.filter((item) => {
      const searchFields = [
        item?.membre_info?.nom_complet,
        item?.membre_info?.numero_membre,
        item?.membre_info?.email,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return searchFields.includes(search.toLowerCase());
    });
  }, [renflouements, search, filterStatus]);

  // Pagination
  const paginatedRenflouements = useMemo(() => {
    return filteredRenflouements.slice(0, displayedItems);
  }, [filteredRenflouements, displayedItems]);

  const hasMore = displayedItems < filteredRenflouements.length;

  const loadMore = () => {
    setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, filteredRenflouements.length));
  };

  // Reset pagination when search or filter changes
  useMemo(() => {
    setDisplayedItems(ITEMS_PER_PAGE);
  }, [search, filterStatus]);

  // Actions
  const openPaymentModal = (renflouement: Renflouement) => {
    setCurrentRenflouement(renflouement);
    setMontant("");
    setNotes("");
    setModalType("payment");
    setShowModal(true);
  };

  const openSavingsModal = (renflouement: Renflouement) => {
    setCurrentRenflouement(renflouement);
    // Pré-remplir avec le montant restant
    setMontant(String(Math.ceil(Number(renflouement.montant_restant || 0))));
    setNotes("");
    setModalType("savings");
    setShowModal(true);
  };

  const openDetailsModal = (renflouement: Renflouement) => {
    setCurrentRenflouement(renflouement);
    setShowModal(`details-${renflouement.id}`);
  };

  // 1. Fonction qui déclenche l'alerte de confirmation
  const handleAddPayment = () => {
  const montantNum = Number(montant);
  
  // Validation stricte (Point 6 de ta checklist)
  if (!montant || isNaN(montantNum) || montantNum <= 0) {
    Alert.alert("Champs invalides", "Veuillez saisir un montant correct avant de valider.");
    return;
  }

    const montantRestant = (currentRenflouement as any).montant_restant || 0;

    // Vérifier si le montant dépasse le montant attendu
    if (montantNum > montantRestant) {
      Alert.alert(
        "Confirmation de paiement",
        `Montant à payer :\n${formatCurrency(montantNum)}\n\n` +
        `Montant restant :\n${formatCurrency(montantRestant)}\n\n` +
        `Dépassement :\n+${formatCurrency(montantNum - montantRestant)}\n\n` +
        `Voulez-vous continuer ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer le paiement", onPress: submitPayment }
        ]
      );
    } else {
      submitPayment();
    }
  };

  const handlePaymentWithSavings = () => {
    if (!currentRenflouement) return;

    const montantNum = montant ? Number(montant) : undefined;
    const montantRestant = currentRenflouement.montant_restant || 0;

    // Validation stricte - le montant est obligatoire
    if (!montant || montantNum === undefined || isNaN(montantNum) || montantNum <= 0) {
      Alert.alert(
        "Montant invalide",
        "Veuillez saisir un montant valide supérieur à 0."
      );
      return;
    }

    // Vérifier que le montant ne dépasse pas le restant
    if (montantNum > montantRestant+500) { // On peut autoriser un petit dépassement de 500 FCFA pour arrondir
      Alert.alert(
        "Montant trop élevé",
        `Le montant saisi (${formatCurrency(montantNum)}) dépasse le restant dû (${formatCurrency(montantRestant)}). Veuillez réduire le montant.`
      );
      return;
    }

    // Montant valide - demander confirmation
    Alert.alert(
      "Confirmation",
      `Voulez-vous débiter ${formatCurrency(montantNum)} de votre épargne ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            submitPaymentWithSavings(montantNum);
          }
        }
      ]
    );
  };

  const submitPaymentWithSavings = (amount?: number) => {
    if (!currentRenflouement) return;

    const montantFinal = amount || (montant ? Number(montant) : undefined);

    payWithSavings.mutate(
      {
        renflouementId: currentRenflouement.id,
        montant: montantFinal,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setModalType(null);
          setMontant("");
          setNotes("");
          setCurrentRenflouement(null);
          refetch();
          Alert.alert(
            "Succès",
            "Paiement avec épargne effectué avec succès !"
          );
        },
        onError: (err: any) => {
          Alert.alert(
            "Erreur",
            err?.response?.data?.error ||
              "Impossible d'effectuer le paiement avec épargne."
          );
        },
      }
    );
  };
  const submitPayment = () => {
    if (!currentRenflouement) return;

    const montantNum = Number(montant);

    createPayment.mutate(
      {
        renflouement: currentRenflouement.id,
        montant: montantNum,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setModalType(null);
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
    setModalType(null);
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
              placeholder="Rechercher par nom, numéro, email..."
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
              { key: 'all', label: 'Tous', count: renflouements.length },
              { key: 'solde', label: 'Soldés', count: renflouements.filter(r => r.is_solde).length },
              { key: 'en-cours', label: 'En cours', count: renflouements.filter(r => !r.is_solde).length },
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

        {/* Compteur de résultats */}
        {!isLoading && !isError && filteredRenflouements.length > 0 && (
          <View style={styles.resultsCounter}>
            <Ionicons name="list" size={18} color={COLORS.primary} />
            <Text style={styles.resultsCounterText}>
              Affichage de <Text style={styles.resultsCounterBold}>{paginatedRenflouements.length}</Text> sur{' '}
              <Text style={styles.resultsCounterBold}>{filteredRenflouements.length}</Text> résultat{filteredRenflouements.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

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
          <>
            <FlatList
              data={paginatedRenflouements}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RenflouementCard
                  item={item}
                  onPayment={openPaymentModal}
                  onDetails={openDetailsModal}
                  onPaymentWithSavings={openSavingsModal}
                  readOnly={readOnly}
                />
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
            />

            {/* Bouton "Voir plus" */}
            {hasMore && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                <LinearGradient
                  colors={[COLORS.primary, "#3A86FF"]}
                  style={styles.loadMoreGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.loadMoreText}>
                    Voir plus ({filteredRenflouements.length - displayedItems} restant{filteredRenflouements.length - displayedItems > 1 ? 's' : ''})
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{height: 70}}></View>
      </ScrollView>

      {/* Modal Paiement / Paiement avec Épargne */}
      <Modal 
        visible={showModal === true && (modalType === "payment" || modalType === "savings")} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={[COLORS.primary, "#3A86FF"]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>
                  {modalType === "savings" ? "Paiement avec Épargne" : "Nouveau Paiement"}
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView 
                style={styles.modalBody} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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

                {modalType === "savings" && (
                  <View style={[styles.modalFinancialInfo, { backgroundColor: COLORS.warning + "10", borderColor: COLORS.warning }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
                      <Ionicons name="wallet-outline" size={20} color={COLORS.warning} />
                      <Text style={[styles.modalFinancialLabel, { marginLeft: SPACING.sm, fontWeight: "600", color: COLORS.warning }]}>
                        Paiement depuis l'épargne
                      </Text>
                    </View>
                    <Text style={[styles.modalFinancialLabel, { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary }]}>
                      Le montant sera débité directement de l'épargne personnelle du membre.
                    </Text>
                  </View>
                )}

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>
                    Montant du paiement *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={montant}
                    onChangeText={setMontant}
                    placeholder="Entrez le montant en FCFA"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textLight}
                    editable={!createPayment.isPending && !payWithSavings.isPending}
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
                    textAlignVertical="top"
                    placeholderTextColor={COLORS.textLight}
                    editable={!createPayment.isPending && !payWithSavings.isPending}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                  disabled={createPayment.isPending || payWithSavings.isPending}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    modalType === "savings" ? styles.savingsConfirmButton : styles.confirmButton
                  ]}
                  onPress={
                    modalType === "savings"
                      ? handlePaymentWithSavings
                      : handleAddPayment
                  }
                  disabled={createPayment.isPending || payWithSavings.isPending}
                >
                  {createPayment.isPending || payWithSavings.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      {modalType === "savings" ? "Débiter l'épargne" : "Valider"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
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

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                      scrollEnabled={false}
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
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },

  // Stats Section
  statsSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  loader: {
    marginVertical: SPACING.xl,
  },
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
    marginBottom: SPACING.xs,
  },
  statSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: SPACING.lg,
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

  // Results Counter
  resultsCounter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + "10",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  resultsCounterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  resultsCounterBold: {
    fontWeight: "bold",
    color: COLORS.primary,
  },

  // Renflouement Card
  renflouementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.primary,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    color: "white",
    fontWeight: "600",
  },
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
    color: COLORS.text,
    fontWeight: "600",
  },
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
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  detailsInfo: {
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  recentPayments: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
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
    paddingVertical: SPACING.xs,
  },
  paymentAmount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: "600",
  },
  paymentDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  detailsButton: {
    backgroundColor: COLORS.surface,
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

  // Load More Button
  loadMoreButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadMoreGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },

  // Center States
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
    color: COLORS.text,
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
    fontSize: FONT_SIZES.md,
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

  // Modal Styles
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
    maxHeight: "85%",
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
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
  },
  modalBody: {
    padding: SPACING.lg,
    maxHeight: 500,
  },
  memberInfoSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalMemberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalMemberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  modalFinancialInfo: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalFinancialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  modalFinancialLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  modalFinancialValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
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
  modalActions: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  savingsConfirmButton: {
    backgroundColor: COLORS.warning,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
  paymentsListContainer: {
    minHeight: 200,
  },
  paymentDetailCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
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
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  paymentDetailNotes: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  emptyPayments: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  emptyPaymentsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  savingsButton: {
    backgroundColor: COLORS.warning, // ou une couleur spécifique
    flex: 1,
  },
  savingsButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
});