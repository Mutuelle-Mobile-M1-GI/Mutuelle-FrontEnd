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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSavings, useCreateSaving, useSavingsStats } from "../../hooks/useSaving";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { SavingTransaction } from "../../types/saving.types";
import { Member } from "../../types/member.types";
import { useNavigation } from "@react-navigation/native";
import { useAuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const MODAL_MEMBERS_PER_PAGE = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberSavings {
  id: string;
  numero_membre: string;
  nom_complet: string;
  email: string;
  statut: string;
  total_epargne: number;
  total_depots: number;
  total_retraits: number;
  nombre_transactions: number;
  derniere_transaction?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number | undefined | null): string => {
  if (!amount || isNaN(amount)) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

// ─── StatCard ─────────────────────────────────────────────────────────────────

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
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  </View>
);

// ─── SavingCard ───────────────────────────────────────────────────────────────

interface SavingCardProps {
  member: MemberSavings;
  onAddSaving: () => void;
  readOnly?: boolean;
}

const SavingCard = ({ member, onAddSaving, readOnly }: SavingCardProps) => {
  const levelColor =
    member.total_epargne >= 100000
      ? COLORS.success
      : member.total_epargne >= 50000
      ? COLORS.warning
      : "#B5179E";

  return (
    <View style={[styles.savingCard, { borderLeftColor: levelColor }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardAvatar, { backgroundColor: levelColor }]}>
          <Text style={styles.cardAvatarText}>{getInitials(member.nom_complet)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{member.nom_complet}</Text>
          <Text style={styles.cardNumber}>{member.numero_membre}</Text>
          {member.email ? (
            <Text style={styles.cardEmail} numberOfLines={1}>
              {member.email}
            </Text>
          ) : null}
        </View>
        {!readOnly && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: levelColor }]}
            onPress={onAddSaving}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Épargne totale */}
      <View style={styles.cardAmounts}>
        <View style={styles.cardAmountMain}>
          <Text style={styles.cardAmountLabel}>Épargne totale</Text>
          <Text style={[styles.cardAmountValue, { color: levelColor }]}>
            {formatCurrency(member.total_epargne)}
          </Text>
        </View>
        <View style={styles.cardAmountRow}>
          <View style={styles.cardAmountItem}>
            <Ionicons name="arrow-up" size={14} color={COLORS.success} />
            <Text style={styles.cardAmountItemText}>{formatCurrency(member.total_depots)}</Text>
          </View>
          <View style={styles.cardAmountItem}>
            <Ionicons name="arrow-down" size={14} color={COLORS.error} />
            <Text style={styles.cardAmountItemText}>{formatCurrency(member.total_retraits)}</Text>
          </View>
        </View>
      </View>

      {/* Pied de carte */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterItem}>
          <Ionicons name="swap-horizontal" size={13} color={COLORS.textSecondary} />
          <Text style={styles.cardFooterText}>
            {member.nombre_transactions} transaction
            {member.nombre_transactions !== 1 ? "s" : ""}
          </Text>
        </View>
        {member.derniere_transaction && (
          <View style={styles.cardFooterItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.cardFooterText}>
              {new Date(member.derniere_transaction).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SavingsScreen() {
  const { user } = useAuthContext();
  const readOnly = !user?.can_write;
  const navigation = useNavigation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const [refreshing, setRefreshing] = useState(false);

  // Modal multi-step
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 : sélection membre
  const [modalMemberSearch, setModalMemberSearch] = useState("");
  const [modalMemberPage, setModalMemberPage] = useState(MODAL_MEMBERS_PER_PAGE);
  const [selectedMember, setSelectedMember] = useState<MemberSavings | null>(null);

  // Step 2 : saisie montant
  const [savingAmount, setSavingAmount] = useState("");
  const [savingNotes, setSavingNotes] = useState("");

  // ── Hooks de données ──────────────────────────────────────────────────────
  const {
    data: savingsData,
    isLoading: loadingSavings,
    isError: errorSavings,
    refetch: refetchSavings,
  } = useSavings();
  const {
    data: serverStats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useSavingsStats();
  const { data: membersData, isLoading: loadingMembers } = useMembers();
  const { data: currentSession, isLoading: loadingSession } = useCurrentSession();
  const createSaving = useCreateSaving();

  // ── Normalisation des données ──────────────────────────────────────────────
  const savings: SavingTransaction[] = useMemo(() => {
    if (Array.isArray(savingsData)) return savingsData;
    if (savingsData && Array.isArray((savingsData as any).results))
      return (savingsData as any).results;
    return [];
  }, [savingsData]);

  const members: Member[] = useMemo(() => {
    if (Array.isArray(membersData)) return membersData;
    if (membersData && Array.isArray((membersData as any).results))
      return (membersData as any).results;
    return [];
  }, [membersData]);

  // ── Liste finale des épargnes par membre (serveur + local) ─────────────────
  const finalMembersList = useMemo((): MemberSavings[] => {
    const serverList = (serverStats?.tous_les_membres as any[]) || [];
    return serverList.map((sMember): MemberSavings => {
      const localInfo = members.find((m) => m.id === sMember.id);
      return {
        id: sMember.id,
        numero_membre: sMember.numero,
        nom_complet: sMember.nom,
        email: localInfo?.utilisateur?.email || "",
        statut: sMember.statut || "ACTIF",
        total_epargne: sMember.montant,
        total_depots: sMember.montant,
        total_retraits:
          localInfo?.donnees_financieres?.emprunt?.montant_restant_a_rembourser || 0,
        nombre_transactions:
          localInfo?.donnees_financieres?.epargne?.nombre_transactions || 0,
        derniere_transaction:
          localInfo?.donnees_financieres?.epargne?.derniere_transaction_date,
      };
    });
  }, [serverStats, members]);

  // ── Recherche / pagination principale ─────────────────────────────────────
  const searchedMembers = useMemo((): MemberSavings[] => {
    if (!search.trim()) return finalMembersList;
    return finalMembersList.filter(
      (m) =>
        m.nom_complet.toLowerCase().includes(search.toLowerCase()) ||
        m.numero_membre.toLowerCase().includes(search.toLowerCase())
    );
  }, [finalMembersList, search]);

  useMemo(() => {
    setDisplayedItems(ITEMS_PER_PAGE);
  }, [search]);

  const paginatedMembers = useMemo(
    () => searchedMembers.slice(0, displayedItems),
    [searchedMembers, displayedItems]
  );
  const hasMore = displayedItems < searchedMembers.length;

  // ── Transactions filtrées + paginées (liste principale) ──────────────────
  const filteredSavings = useMemo(() => {
    if (!search.trim()) return savings;
    const q = search.toLowerCase();
    return savings.filter(
      (tx) =>
        (tx.membre_info?.nom_complet ?? "").toLowerCase().includes(q) ||
        (tx.membre_info?.numero_membre ?? "").toLowerCase().includes(q)
    );
  }, [savings, search]);

  const paginatedSavings = useMemo(
    () => filteredSavings.slice(0, displayedItems),
    [filteredSavings, displayedItems]
  );
  const hasSavingsMore = displayedItems < filteredSavings.length;

  // ── Membres filtrés pour le modal (step 1) ─────────────────────────────────
  const modalFilteredMembers = useMemo(() => {
    if (!modalMemberSearch.trim()) return finalMembersList;
    return finalMembersList.filter(
      (m) =>
        m.nom_complet.toLowerCase().includes(modalMemberSearch.toLowerCase()) ||
        m.numero_membre.toLowerCase().includes(modalMemberSearch.toLowerCase())
    );
  }, [finalMembersList, modalMemberSearch]);

  useMemo(() => {
    setModalMemberPage(MODAL_MEMBERS_PER_PAGE);
  }, [modalMemberSearch]);

  const paginatedModalMembers = useMemo(
    () => modalFilteredMembers.slice(0, modalMemberPage),
    [modalFilteredMembers, modalMemberPage]
  );
  const hasMoreModalMembers = modalMemberPage < modalFilteredMembers.length;

  // ── Dernière transaction du membre sélectionné ────────────────────────────
  const selectedMemberLastTransaction = useMemo(() => {
    if (!selectedMember) return null;
    return savings
      .filter((t) => t.membre === selectedMember.id)
      .sort(
        (a, b) =>
          new Date(b.date_transaction).getTime() -
          new Date(a.date_transaction).getTime()
      )[0] || null;
  }, [selectedMember, savings]);

  // ── Loading / error ────────────────────────────────────────────────────────
  const isLoading = loadingSavings || loadingMembers || loadingSession || loadingStats;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSavings(), refetchStats()]);
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  const openAddModal = (preselected?: MemberSavings) => {
    if (preselected) {
      setSelectedMember(preselected);
      setCurrentStep(2);
    } else {
      setSelectedMember(null);
      setCurrentStep(1);
    }
    setModalMemberSearch("");
    setSavingAmount("");
    setSavingNotes("");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedMember(null);
    setSavingAmount("");
    setSavingNotes("");
    setCurrentStep(1);
    setModalMemberSearch("");
  };

  const handleCreateSaving = () => {
    if (!selectedMember || !currentSession?.id) return;

    createSaving.mutate(
      {
        membre: selectedMember.id,
        session: currentSession.id,
        montant: Number(savingAmount),
        type_transaction: "DEPOT",
        notes: savingNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          closeAddModal();
          Alert.alert("Succès", "Épargne enregistré avec succès !");
        },
        onError: (error: any) => {
          Alert.alert(
            "Erreur",
            error?.response?.data?.details ||
              error?.response?.data?.error ||
              "Impossible d'enregistrer le dépôt."
          );
        },
      }
    );
  };

  // ── Rendu du modal multi-step ──────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View
            style={[
              styles.stepDot,
              currentStep >= step ? styles.stepDotActive : styles.stepDotInactive,
            ]}
          >
            {currentStep > step ? (
              <Ionicons name="checkmark" size={12} color="white" />
            ) : (
              <Text style={styles.stepDotText}>{step}</Text>
            )}
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step ? styles.stepLineActive : styles.stepLineInactive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>Choisir un membre</Text>

      {/* Barre de recherche */}
      <View style={styles.modalSearchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.modalSearchInput}
          value={modalMemberSearch}
          onChangeText={setModalMemberSearch}
          placeholder="Rechercher par nom ou numéro..."
          placeholderTextColor={COLORS.textLight}
          autoFocus
        />
        {modalMemberSearch.length > 0 && (
          <TouchableOpacity onPress={() => setModalMemberSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.modalResultCount}>
        {modalFilteredMembers.length} membre
        {modalFilteredMembers.length !== 1 ? "s" : ""}
      </Text>

      <ScrollView style={styles.modalMemberList} showsVerticalScrollIndicator={false}>
        {paginatedModalMembers.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={[
              styles.modalMemberItem,
              selectedMember?.id === member.id && styles.modalMemberItemSelected,
            ]}
            onPress={() => {
              setSelectedMember(member);
              setCurrentStep(2);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.modalMemberAvatar,
                {
                  backgroundColor:
                    member.total_epargne >= 100000
                      ? COLORS.success
                      : member.total_epargne >= 50000
                      ? COLORS.warning
                      : "#B5179E",
                },
              ]}
            >
              <Text style={styles.modalMemberAvatarText}>
                {getInitials(member.nom_complet)}
              </Text>
            </View>
            <View style={styles.modalMemberItemInfo}>
              <Text style={styles.modalMemberItemName}>{member.nom_complet}</Text>
              <Text style={styles.modalMemberItemNumber}>{member.numero_membre}</Text>
            </View>
            <View style={styles.modalMemberItemAmount}>
              <Text style={styles.modalMemberItemAmountText}>
                {formatCurrency(member.total_epargne)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}

        {hasMoreModalMembers && (
          <TouchableOpacity
            style={styles.modalLoadMore}
            onPress={() =>
              setModalMemberPage((p) =>
                Math.min(p + MODAL_MEMBERS_PER_PAGE, modalFilteredMembers.length)
              )
            }
          >
            <Text style={styles.modalLoadMoreText}>
              Voir plus ({modalFilteredMembers.length - modalMemberPage} restant
              {modalFilteredMembers.length - modalMemberPage !== 1 ? "s" : ""})
            </Text>
            <Ionicons name="chevron-down" size={16} color="#B5179E" />
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Montant de l'épargne</Text>

      {/* Informations membre */}
      {selectedMember && (
        <View style={styles.memberDetailCard}>
          <View style={styles.memberDetailAvatar}>
            <Text style={styles.memberDetailAvatarText}>
              {getInitials(selectedMember.nom_complet)}
            </Text>
          </View>
          <View style={styles.memberDetailInfo}>
            <Text style={styles.memberDetailName}>{selectedMember.nom_complet}</Text>
            <Text style={styles.memberDetailNumber}>{selectedMember.numero_membre}</Text>
            {selectedMember.email ? (
              <Text style={styles.memberDetailEmail} numberOfLines={1}>
                {selectedMember.email}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Résumé épargne actuelle */}
      <View style={styles.currentSavingsCard}>
        <Text style={styles.currentSavingsTitle}>Situation actuelle</Text>
        <View style={styles.currentSavingsRow}>
          <Text style={styles.currentSavingsLabel}>Épargne totale</Text>
          <Text style={[styles.currentSavingsValue, { color: "#B5179E" }]}>
            {formatCurrency(selectedMember?.total_epargne)}
          </Text>
        </View>
        <View style={styles.currentSavingsRow}>
          <Text style={styles.currentSavingsLabel}>Nb. transactions</Text>
          <Text style={styles.currentSavingsValue}>
            {selectedMember?.nombre_transactions ?? 0}
          </Text>
        </View>
        {selectedMemberLastTransaction && (
          <View style={styles.currentSavingsRow}>
            <Text style={styles.currentSavingsLabel}>Dernière transaction</Text>
            <Text style={styles.currentSavingsValue}>
              {formatCurrency(selectedMemberLastTransaction.montant)}{" "}
              <Text style={styles.currentSavingsDate}>
                (
                {new Date(
                  selectedMemberLastTransaction.date_transaction
                ).toLocaleDateString("fr-FR")}
                )
              </Text>
            </Text>
          </View>
        )}
      </View>

      {/* Saisie montant */}
      <View style={styles.formSection}>
        <Text style={styles.inputLabel}>
          Montant <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={savingAmount}
          onChangeText={setSavingAmount}
          placeholder="Montant en FCFA"
          keyboardType="numeric"
          placeholderTextColor={COLORS.textLight}
          autoFocus
        />

        <Text style={styles.inputLabel}>Notes (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={savingNotes}
          onChangeText={setSavingNotes}
          placeholder="Notes sur ce dépôt..."
          multiline
          numberOfLines={3}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      {/* Navigation */}
      <View style={styles.stepNavRow}>
        <TouchableOpacity
          style={[styles.stepNavBtn, styles.stepNavBtnSecondary]}
          onPress={() => setCurrentStep(1)}
        >
          <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
          <Text style={styles.stepNavBtnTextSecondary}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.stepNavBtn,
            styles.stepNavBtnPrimary,
            { opacity: !savingAmount.trim() || Number(savingAmount) <= 0 ? 0.4 : 1 },
          ]}
          onPress={() => setCurrentStep(3)}
          disabled={!savingAmount.trim() || Number(savingAmount) <= 0}
        >
          <Text style={styles.stepNavBtnTextPrimary}>Continuer</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Récapitulatif</Text>

      <View style={styles.recapCard}>
        {/* Membre */}
        <View style={styles.recapSection}>
          <Text style={styles.recapSectionTitle}>Membre</Text>
          <View style={styles.recapMemberRow}>
            <View style={styles.recapAvatar}>
              <Text style={styles.recapAvatarText}>
                {selectedMember ? getInitials(selectedMember.nom_complet) : "?"}
              </Text>
            </View>
            <View>
              <Text style={styles.recapMemberName}>{selectedMember?.nom_complet}</Text>
              <Text style={styles.recapMemberNumber}>{selectedMember?.numero_membre}</Text>
            </View>
          </View>
        </View>

        <View style={styles.recapDivider} />

        {/* Transaction */}
        <View style={styles.recapSection}>
          <Text style={styles.recapSectionTitle}>Transaction</Text>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Type</Text>
            <View style={styles.recapTypeBadge}>
              <Text style={styles.recapTypeBadgeText}>Dépôt</Text>
            </View>
          </View>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Montant</Text>
            <Text style={[styles.recapValueLarge, { color: "#B5179E" }]}>
              {formatCurrency(Number(savingAmount))}
            </Text>
          </View>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Session</Text>
            <Text style={styles.recapValue}>{currentSession?.nom || "—"}</Text>
          </View>
          {savingNotes.trim() ? (
            <View style={[styles.recapRow, { alignItems: "flex-start" }]}>
              <Text style={styles.recapLabel}>Notes</Text>
              <Text style={[styles.recapValue, { flex: 1, textAlign: "right" }]}>
                {savingNotes}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.recapDivider} />

        {/* Après opération */}
        <View style={styles.recapSection}>
          <Text style={styles.recapSectionTitle}>Après cette opération</Text>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Épargne actuelle</Text>
            <Text style={styles.recapValue}>
              {formatCurrency(selectedMember?.total_epargne)}
            </Text>
          </View>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Nouveau total estimé</Text>
            <Text style={[styles.recapValueLarge, { color: COLORS.success }]}>
              {formatCurrency(
                (selectedMember?.total_epargne ?? 0) + Number(savingAmount)
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.stepNavRow}>
        <TouchableOpacity
          style={[styles.stepNavBtn, styles.stepNavBtnSecondary]}
          onPress={() => setCurrentStep(2)}
        >
          <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
          <Text style={styles.stepNavBtnTextSecondary}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.stepNavBtn,
            styles.stepNavBtnConfirm,
            { opacity: createSaving.isPending ? 0.6 : 1 },
          ]}
          onPress={handleCreateSaving}
          disabled={createSaving.isPending}
        >
          {createSaving.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.stepNavBtnTextPrimary}>Valider</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );

  const stepLabels = ["Membre", "Montant", "Validation"];

  // ── Rendu principal ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header figé ── */}
      <LinearGradient
        colors={["#B5179E", "#F72585"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="wallet" size={32} color="white" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Gestion des Épargnes</Text>
          <Text style={styles.headerSubtitle}>
            Session : {currentSession?.nom || "Chargement..."}
          </Text>
        </View>
      </LinearGradient>

      {/* ── Contenu scrollable ── */}
      <FlatList
        data={[{ type: "content" }]}
        keyExtractor={() => "main"}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <View>
            {/* ── Statistiques globales ── */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Épargne totale"
                  value={formatCurrency(serverStats?.epargne_totale || 0)}
                  icon="wallet"
                  color="#B5179E"
                  subtitle={`${serverStats?.total_membres || 0} membres`}
                />
                <StatCard
                  title="Trésor en Caisse"
                  value={formatCurrency(serverStats?.tresor_total || 0)}
                  icon="cash-outline"
                  color={
                    (serverStats?.tresor_total ?? 0) < 0 ? COLORS.error : COLORS.success
                  }
                  subtitle="Liquidités réelles"
                />
                <StatCard
                  title="Transactions"
                  value={serverStats?.transactions_ce_mois?.toString() || "0"}
                  icon="swap-horizontal"
                  color={COLORS.warning}
                  subtitle="Ce mois-ci"
                />
              </View>
            </View>

            {/* ── Barre de recherche + bouton ajout ── */}
            <View style={styles.searchSection}>
              <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher par nom de membre..."
                    placeholderTextColor={COLORS.textLight}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {!readOnly && (
                  <TouchableOpacity
                    style={styles.addFabButton}
                    onPress={() => openAddModal()}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#B5179E", "#F72585"]}
                      style={styles.addFabGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="add" size={18} color="white" />
                      <Text style={styles.addFabText}>Ajouter épargne</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {!isLoading && filteredSavings.length > 0 && (
                <Text style={styles.resultsCount}>
                  {paginatedSavings.length} / {filteredSavings.length} transaction
                  {filteredSavings.length !== 1 ? "s" : ""} affichée
                  {filteredSavings.length !== 1 ? "s" : ""}
                </Text>
              )}
            </View>

            {/* ── Contenu : chargement / erreur / liste transactions / vide ── */}
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#B5179E" />
                <Text style={styles.loadingText}>Chargement des transactions...</Text>
              </View>
            ) : savings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={72} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucune épargne enregistrée</Text>
                <Text style={styles.emptyText}>
                  Commencez par enregistrer le premier dépôt d'épargne d'un membre.
                </Text>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.emptyCreateButton}
                    onPress={() => openAddModal()}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#B5179E", "#F72585"]}
                      style={styles.emptyCreateGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="white" />
                      <Text style={styles.emptyCreateText}>Enregistrer une épargne</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            ) : filteredSavings.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="search-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucun résultat</Text>
                <Text style={styles.emptyText}>
                  Aucune transaction ne correspond à « {search} ».
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {paginatedSavings.map((tx) => {
                  const isDepot   = tx.type_transaction === "DEPOT";
                  const isInteret = tx.type_transaction === "INTERET";
                  const color     = isDepot ? COLORS.success : isInteret ? COLORS.primary : COLORS.error;
                  const icon      = isDepot ? "arrow-up-circle" : isInteret ? "trending-up" : "arrow-down-circle";
                  const sign      = isDepot || isInteret ? "+" : "−";
                  return (
                    <View
                      key={tx.id}
                      style={[styles.txCard, { borderLeftColor: color }]}
                    >
                      <View style={[styles.txIconCircle, { backgroundColor: color + "20" }]}>
                        <Ionicons name={icon as any} size={22} color={color} />
                      </View>
                      <View style={styles.txBody}>
                        <View style={styles.txTopRow}>
                          <Text style={styles.txType}>{tx.type_transaction_display || tx.type_transaction}</Text>
                          <Text style={styles.txDate}>
                            {tx.date_transaction
                              ? new Date(tx.date_transaction).toLocaleDateString("fr-FR")
                              : "—"}
                          </Text>
                        </View>
                        <Text style={[styles.txAmount, { color }]}>
                          {sign} {formatCurrency(Number(tx.montant))}
                        </Text>
                        {(tx.membre_info?.nom_complet) && (
                          <View style={styles.txMemberRow}>
                            <Ionicons name="person-circle-outline" size={13} color={COLORS.textSecondary} />
                            <Text style={styles.txMemberText}>
                              {tx.membre_info.nom_complet}
                              {tx.membre_info.numero_membre ? `  ·  ${tx.membre_info.numero_membre}` : ""}
                            </Text>
                          </View>
                        )}
                        {tx.session_nom && (
                          <Text style={styles.txSession}>{tx.session_nom}</Text>
                        )}
                        {tx.notes && (
                          <Text style={styles.txNotes} numberOfLines={1}>{tx.notes}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}

                {hasSavingsMore && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setDisplayedItems((p) => Math.min(p + ITEMS_PER_PAGE, filteredSavings.length))}
                  >
                    <LinearGradient
                      colors={["#B5179E", "#F72585"]}
                      style={styles.loadMoreGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.loadMoreText}>
                        Voir plus ({filteredSavings.length - displayedItems} restant
                        {filteredSavings.length - displayedItems !== 1 ? "s" : ""})
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <View style={{ height: SPACING.xxl }} />
              </View>
            )}
          </View>
        )}
      />

      {/* ── Modal multi-step ── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* En-tête modal */}
              <LinearGradient
                colors={["#B5179E", "#F72585"]}
                style={styles.modalHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Nouvelle épargne</Text>
                  <Text style={styles.modalStepLabel}>
                    Étape {currentStep} : {stepLabels[currentStep - 1]}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeAddModal}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              {/* Indicateur d'étapes */}
              <View style={styles.stepIndicatorWrapper}>{renderStepIndicator()}</View>

              {/* Corps du modal */}
              <View style={styles.modalBody}>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    alignItems: "center",
    width: "100%",
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
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },

  // Stats
  statsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  statsGrid: {
    gap: SPACING.sm,
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
  },
  statSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Recherche + bouton
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  addFabButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    shadowColor: "#B5179E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  addFabGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 6,
  },
  addFabText: {
    color: "white",
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
  },
  resultsCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },

  // Liste
  listContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },

  // SavingCard
  savingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  cardAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAmounts: {
    marginBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardAmountMain: {
    marginBottom: SPACING.xs,
  },
  cardAmountLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  cardAmountValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
  },
  cardAmountRow: {
    flexDirection: "row",
    gap: SPACING.lg,
  },
  cardAmountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardAmountItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardFooterText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },

  // Load more
  loadMoreButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
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

  // Center / Empty
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  emptyCreateButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
  },
  emptyCreateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyCreateText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    height: "88%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
  },
  modalStepLabel: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  // Step indicator
  stepIndicatorWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#B5179E",
  },
  stepDotInactive: {
    backgroundColor: COLORS.border,
  },
  stepDotText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: "white",
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: SPACING.xs,
  },
  stepLineActive: {
    backgroundColor: "#B5179E",
  },
  stepLineInactive: {
    backgroundColor: COLORS.border,
  },

  modalBody: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    overflow: "hidden",
  },

  // Step titles
  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  // Step 1 – modal member search
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  modalResultCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  modalMemberList: {
    flex: 1,
  },
  modalMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalMemberItemSelected: {
    borderColor: "#B5179E",
    backgroundColor: "#B5179E10",
  },
  modalMemberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  modalMemberAvatarText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: "white",
  },
  modalMemberItemInfo: {
    flex: 1,
  },
  modalMemberItemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalMemberItemNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  modalMemberItemAmount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalMemberItemAmountText: {
    fontSize: FONT_SIZES.sm,
    color: "#B5179E",
    fontWeight: "600",
  },
  modalLoadMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  modalLoadMoreText: {
    fontSize: FONT_SIZES.sm,
    color: "#B5179E",
    fontWeight: "600",
  },

  // Step 2 – member detail
  memberDetailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  memberDetailAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#B5179E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  memberDetailAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  memberDetailInfo: {
    flex: 1,
  },
  memberDetailName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  memberDetailNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  memberDetailEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 1,
  },
  currentSavingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  currentSavingsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  currentSavingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currentSavingsLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  currentSavingsValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  currentSavingsDate: {
    fontWeight: "400",
    color: COLORS.textSecondary,
  },

  // Form
  formSection: {
    marginBottom: SPACING.sm,
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

  // Step navigation
  stepNavRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  stepNavBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  stepNavBtnSecondary: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepNavBtnPrimary: {
    backgroundColor: "#B5179E",
  },
  stepNavBtnConfirm: {
    backgroundColor: COLORS.success,
  },
  stepNavBtnTextSecondary: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  stepNavBtnTextPrimary: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },

  // Transaction cards
  txCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  txBody: { flex: 1 },
  txTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  txType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  txDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  txAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
    marginBottom: 3,
  },
  txMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  txMemberText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  txSession: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  txNotes: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Step 3 – récap
  recapCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  recapSection: {
    padding: SPACING.md,
  },
  recapSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  recapDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  recapMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  recapAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B5179E",
    alignItems: "center",
    justifyContent: "center",
  },
  recapAvatarText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: "white",
  },
  recapMemberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  recapMemberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  recapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  recapLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  recapValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  recapValueLarge: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
  },
  recapTypeBadge: {
    backgroundColor: "#B5179E20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  recapTypeBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: "#B5179E",
  },
});