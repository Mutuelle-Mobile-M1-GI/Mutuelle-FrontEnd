import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useQueryClient } from "@tanstack/react-query";
import NotificationButton from "../../components/NotificationButton";
import {
  useCreateRenflouementPayment,
  useRenfloulementExerciceDetail,
  useRenfloulementHistoryByMember,
  usePayRenflouementWithSavings,
  useRenflouements,
} from "../../hooks/useRenflouement";
import { useExercises } from "../../hooks/useListData";
import { useMembers } from "../../hooks/useMember";
import { useSavingsAvailable } from "../../hooks/useWithdrawal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getInitials, normalizeArray } from "../../utils/helpers";

const ITEMS_PER_PAGE = 10;
const TEAL = "#14B8A6";
const TEAL2 = "#0D9488";
const TEAL_DARK = "#0F766E";

type TabView = "exercices" | "membres";
type PaymentMethod = "standard" | "savings";

// ─────────────────────────────────────────────
// 🔙 BOUTON RETOUR PRO
// ─────────────────────────────────────────────
const BackButton = ({ onPress, label = "Retour" }: { onPress: () => void; label?: string }) => (
  <TouchableOpacity
    style={[styles.backButton, label ? styles.backButtonWithLabel : null]}
    onPress={onPress}
    activeOpacity={0.85}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="chevron-back" size={20} color="white" />
    {label ? <Text style={styles.backButtonLabel}>{label}</Text> : null}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// 🎯 EN-TÊTE GRADIENT (écran principal & modales)
// ─────────────────────────────────────────────
const ScreenHeader = ({
  title,
  subtitle,
  icon,
  topInset,
  onBack,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  topInset: number;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}) => (
  <LinearGradient
    colors={[TEAL, TEAL2, TEAL_DARK]}
    style={[styles.headerGradient, { paddingTop: topInset + SPACING.sm }]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View style={styles.headerTopRow}>
      {onBack ? (
        <BackButton onPress={onBack} />
      ) : (
        <View style={styles.headerSpacer} />
      )}
      {rightSlot ?? <View style={styles.headerSpacer} />}
    </View>

    <View style={styles.headerContent}>
      <View style={styles.headerIconWrap}>
        <Ionicons name={icon as React.ComponentProps<typeof Ionicons>["name"]} size={28} color="white" />
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  </LinearGradient>
);

const resolveMemberId = (item: any) =>
  item?.membre?.id ||
  item?.membre_info?.id ||
  item?.member?.id ||
  item?.id ||
  null;

const getTotalFromMemberHistory = (history: any): number | null => {
  if (!history) return null;

  if (history.cumuls_totaux?.total_du != null) {
    return Number(history.cumuls_totaux.total_du);
  }

  if (Array.isArray(history.renflouements_par_exercice)) {
    return history.renflouements_par_exercice.reduce(
      (sum: number, exercice: any) =>
        sum + Number(exercice.montant_du ?? exercice.totals?.montant_du ?? 0),
      0
    );
  }

  return null;
};

const aggregateRenflouementsByMember = (renflouements: any[]): Map<string, number> => {
  const map = new Map<string, number>();

  renflouements.forEach((renflouement) => {
    if (
      renflouement.type_cause &&
      renflouement.type_cause !== "RENFLOUEMENT_FIN_EXERCICE"
    ) {
      return;
    }

    const memberId = renflouement.membre || renflouement.membre_info?.id;
    if (!memberId) return;

    const key = String(memberId);
    map.set(key, (map.get(key) || 0) + Number(renflouement.montant_du || 0));
  });

  return map;
};

const resolveRenflouement = (item: any) => {
  if (item?.renflouement?.id) {
    return {
      ...item.renflouement,
      montant_du: item?.montants?.montant_du ?? item.renflouement?.montant_du ?? 0,
      montant_paye: item?.montants?.montant_paye ?? item.renflouement?.montant_paye ?? 0,
    };
  }

  if (Array.isArray(item?.renflouements) && item.renflouements.length > 0) {
    const candidate =
      item.renflouements.find((renflouement: any) => (renflouement?.montant_restant ?? 0) > 0) ||
      item.renflouements[0];

    if (candidate?.id) {
      return {
        ...candidate,
        montant_du: candidate?.montant_du ?? item?.montant_du ?? 0,
        montant_paye: candidate?.montant_paye ?? item?.montant_paye ?? 0,
      };
    }
  }

  if (item?.id && typeof item?.montant_du !== "undefined") {
    return item;
  }

  return null;
};

// ─────────────────────────────────────────────
// 📊 STAT CARD COMPACT
// ─────────────────────────────────────────────
const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) => (
  <View style={[styles.statCard, { borderColor: color + "25" }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// 🏢 CARD SIMPLE EXERCICE
// ─────────────────────────────────────────────
const ExerciceSimpleCard = ({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) => {
  const stats = item.renflouement_stats || {
    montant_total_du: 0,
    montant_total_paye: 0,
    montant_total_restant: 0,
  };
  
  const totalDu = stats.montant_total_du;
  const totalPaye = stats.montant_total_paye;
  const restant = stats.montant_total_restant || (totalDu - totalPaye);
  const progress = totalDu > 0 ? Math.min(100, (totalPaye / totalDu) * 100) : 0;

  return (
    <TouchableOpacity style={styles.simpleCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.simpleCardHeader}>
        <View style={styles.simpleCardIconWrap}>
          <Ionicons name="calendar-outline" size={18} color={TEAL} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.simpleCardTitle}>{item.nom}</Text>
          <Text style={styles.simpleCardDate}>
            {new Date(item.date_debut).toLocaleDateString("fr-FR")}
          </Text>
        </View>
        <View style={[styles.simpleBadge, { backgroundColor: item.statut === "TERMINE" ? "#F3F4F6" : TEAL + "15" }]}>
          <Text style={[styles.simpleBadgeText, { color: item.statut === "TERMINE" ? "#64748B" : TEAL2 }]}>
            {item.statut}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} style={{ marginLeft: 4 }} />
      </View>

      <View style={styles.simpleCardAmounts}>
        <View style={styles.simpleAmount}>
          <Text style={styles.simpleAmountLabel}>À collecter</Text>
          <Text style={styles.simpleAmountValue}>{formatCurrency(totalDu)}</Text>
        </View>
        <View style={styles.simpleAmountDivider} />
        <View style={styles.simpleAmount}>
          <Text style={styles.simpleAmountLabel}>Collecté</Text>
          <Text style={[styles.simpleAmountValue, { color: COLORS.success }]}>
            {formatCurrency(totalPaye)}
          </Text>
        </View>
        <View style={styles.simpleAmountDivider} />
        <View style={styles.simpleAmount}>
          <Text style={styles.simpleAmountLabel}>Restant</Text>
          <Text style={[styles.simpleAmountValue, { color: restant > 0 ? COLORS.error : COLORS.success }]}>
            {formatCurrency(restant)}
          </Text>
        </View>
      </View>

      <View style={styles.simpleProgressWrap}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: restant <= 0 ? COLORS.success : TEAL }]} />
        </View>
        <Text style={styles.simpleProgressText}>{progress.toFixed(0)}% collecté</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// 👤 CARD SIMPLE MEMBRE
// ─────────────────────────────────────────────
const MemberSimpleCard = ({
  item,
  totalRenflouement,
  onPress,
}: {
  item: any;
  totalRenflouement: number;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity style={styles.simpleCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.memberCardTop}>
        <LinearGradient colors={[TEAL, TEAL2]} style={styles.smallAvatar}>
          <Text style={styles.smallInitials}>{getInitials(item.utilisateur?.nom_complet || "")}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.simpleCardTitle}>{item.utilisateur?.nom_complet}</Text>
          <Text style={styles.simpleCardDate}>{item.numero_membre}</Text>
          <View style={[styles.statusPill, { backgroundColor: item.statut === "EN_REGLE" ? COLORS.success + "15" : COLORS.warning + "15" }]}>
            <Text style={[styles.statusPillText, { color: item.statut === "EN_REGLE" ? COLORS.success : COLORS.warning }]}>
              {item.statut}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
      </View>
      <View style={styles.memberCardFooter}>
        <Text style={styles.memberTotalLabel}>Total renflouements</Text>
        <Text style={[styles.memberTotalValue, { color: TEAL }]}>
          {formatCurrency(totalRenflouement)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL DETAIL EXERCICE
// ─────────────────────────────────────────────
interface DetailModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  stats: any;
  members: any[];
  isLoading: boolean;
  isMemberView?: boolean;
  onClose: () => void;
  onSelectMember: (member: any) => void;
}

const DetailModal = ({
  visible,
  title,
  subtitle,
  stats,
  members,
  isLoading,
  isMemberView = false,
  onClose,
  onSelectMember,
}: DetailModalProps) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) =>
      (m.membre?.nom_complet || m.utilisateur?.nom_complet || m.exercice || m.exercice_nom || "").toLowerCase().includes(q) ||
      (m.membre?.numero_membre || m.numero_membre || "").toLowerCase().includes(q) ||
      (m.cause || m.type_cause_display || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const paginatedMembers = useMemo(
    () => filteredMembers.slice(0, displayedItems),
    [filteredMembers, displayedItems]
  );
  const hasMore = displayedItems < filteredMembers.length;

  React.useEffect(() => {
    if (visible) {
      setSearch("");
      setDisplayedItems(ITEMS_PER_PAGE);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <ScreenHeader
          title={title}
          subtitle={subtitle || (isMemberView ? "Historique des renflouements" : "Détail par membre")}
          icon={isMemberView ? "person" : "folder-open"}
          topInset={insets.top}
          onBack={onClose}
        />

        {stats && (
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
              <StatCard
                title="À collecter"
                value={formatCurrency(stats.montant_total_du || 0)}
                icon="cash"
                color={TEAL}
              />
              <StatCard
                title="Collecté"
                value={formatCurrency(stats.montant_total_paye || 0)}
                icon="checkmark-circle"
                color={COLORS.success}
              />
              <StatCard
                title="Restant"
                value={formatCurrency((stats.montant_total_du || 0) - (stats.montant_total_paye || 0))}
                icon="time"
                color={COLORS.error}
              />
              <StatCard
                title="Taux"
                value={`${((stats.montant_total_paye || 0) / (stats.montant_total_du || 1) * 100).toFixed(0)}%`}
                icon="trending-up"
                color={COLORS.primary}
              />
            </View>
          </View>
        )}

        <View style={styles.searchSection}>
          <View style={styles.listMetaRow}>
            <Text style={styles.listMetaText}>
              {filteredMembers.length}{" "}
              {isMemberView
                ? `exercice${filteredMembers.length > 1 ? "s" : ""}`
                : `membre${filteredMembers.length > 1 ? "s" : ""}`}
            </Text>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={isMemberView ? "Rechercher un exercice..." : "Rechercher un membre..."}
              placeholderTextColor={COLORS.textLight}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.centerFlex}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>
              {isMemberView ? "Aucun renflouement" : "Aucun membre"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={paginatedMembers}
            keyExtractor={(item, idx) => String(item.membre?.id || item.id || item.exercice_id || idx)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.lg }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              isMemberView ? (
                <ExerciceDetailCard item={item} onPress={() => onSelectMember(item)} />
              ) : (
                <MemberDetailCard item={item} onPress={() => onSelectMember(item)} />
              )
            )}
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setDisplayedItems((p) => p + ITEMS_PER_PAGE)}
                >
                  <LinearGradient colors={[TEAL, TEAL2]} style={styles.loadMoreGrad}>
                    <Text style={styles.loadMoreText}>
                      Voir plus ({filteredMembers.length - displayedItems} restant)
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📝 CARD DETAIL EXERCICE (dans modal exercice)
// ─────────────────────────────────────────────
const MemberDetailCard = ({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) => {
  const montantDu = item.montants?.montant_du || item.renflouement_info?.montant_du || 0;
  const montantPaye = item.montants?.montant_paye || item.renflouement_info?.montant_paye || 0;
  const restant = montantDu - montantPaye;
  const progress = montantDu > 0 ? (montantPaye / montantDu) * 100 : 0;
  const color = restant <= 0 ? COLORS.success : TEAL;

  const name = item.membre?.nom_complet || item.nom_complet || item.utilisateur?.nom_complet || "";
  const numero = item.membre?.numero_membre || item.numero_membre || "";

  return (
    <TouchableOpacity style={styles.detailCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.detailStripe, { backgroundColor: color }]} />
      <View style={styles.detailBody}>
        <View style={styles.detailTop}>
          <LinearGradient colors={[TEAL, TEAL2]} style={styles.detailAvatar}>
            <Text style={styles.detailInitials}>{getInitials(name)}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>{name}</Text>
            <Text style={styles.detailNumero}>{numero}</Text>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: color + "15" }]}>
            <Text style={[styles.detailPercent, { color }]}>
              {restant <= 0 ? "Soldé" : `${progress.toFixed(0)}%`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} style={{ marginLeft: 6 }} />
        </View>

        <View style={styles.detailAmounts}>
          <View style={styles.detailAmount}>
            <Text style={styles.detailLabel}>Dû</Text>
            <Text style={[styles.detailValue, { color: TEAL }]}>{formatCurrency(montantDu)}</Text>
          </View>
          <View style={styles.detailAmount}>
            <Text style={styles.detailLabel}>Payé</Text>
            <Text style={[styles.detailValue, { color: COLORS.success }]}>{formatCurrency(montantPaye)}</Text>
          </View>
          <View style={styles.detailAmount}>
            <Text style={styles.detailLabel}>Restant</Text>
            <Text style={[styles.detailValue, { color }]}>{formatCurrency(restant)}</Text>
          </View>
        </View>

        <View style={styles.detailProgress}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%`, backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// 👤 CARD DETAIL MEMBRE (dans modal membre)
// ─────────────────────────────────────────────
const ExerciceDetailCard = ({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) => {
  const montantDu = item.montant_du || 0;
  const montantPaye = item.montant_paye || 0;
  const restant = montantDu - montantPaye;
  const progress = montantDu > 0 ? (montantPaye / montantDu) * 100 : 0;
  const color = restant <= 0 ? COLORS.success : TEAL;

  const cause = item.cause || item.type_cause_display || "Renflouement";
  const exerciceName = item.exercice || item.exercice_nom || cause;

  return (
    <TouchableOpacity style={styles.detailCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.detailStripe, { backgroundColor: color }]} />
      <View style={styles.detailBody}>
        <View style={styles.detailTop}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="calendar-outline" size={18} color={TEAL} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>{exerciceName}</Text>
            <Text style={styles.detailNumero}>{formatDate(item.date_creation)}</Text>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: color + "15" }]}>
            <Text style={[styles.detailPercent, { color }]}>
              {restant <= 0 ? "Soldé" : `${progress.toFixed(0)}%`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} style={{ marginLeft: 6 }} />
        </View>

        <View style={styles.detailAmounts}>
          <View style={styles.detailAmount}>
            <Text style={styles.detailLabel}>Dû</Text>
            <Text style={[styles.detailValue, { color: TEAL }]}>{formatCurrency(montantDu)}</Text>
          </View>
          <View style={styles.detailAmount}>
            <Text style={styles.detailLabel}>Payé</Text>
            <Text style={[styles.detailValue, { color: COLORS.success }]}>{formatCurrency(montantPaye)}</Text>
          </View>
          <View style={styles.detailAmount}>
            <Text style={styles.detailLabel}>Restant</Text>
            <Text style={[styles.detailValue, { color }]}>{formatCurrency(restant)}</Text>
          </View>
        </View>

        <View style={styles.detailProgress}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%`, backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// 🏠 ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────
export default function RenflouementScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // États
  const [tab, setTab] = useState<TabView>("exercices");
  const [refreshing, setRefreshing] = useState(false);
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const [search, setSearch] = useState("");
  
  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExercice, setSelectedExercice] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{ member?: any; renflouement?: any; memberId?: string | null }>({});
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const createPayment = useCreateRenflouementPayment();
  const payRenflouement = usePayRenflouementWithSavings();

  // Données
  const { data: exercicesRaw, isLoading: loadingExercices } = useExercises();
  const { data: membersRaw, isLoading: loadingMembers } = useMembers();
  const { data: renflouementsRaw, isLoading: loadingRenflouements } = useRenflouements();

  const exercices = useMemo(() => normalizeArray(exercicesRaw), [exercicesRaw]);
  const members = useMemo(() => normalizeArray(membersRaw), [membersRaw]);
  const renflouementsAll = useMemo(() => normalizeArray(renflouementsRaw), [renflouementsRaw]);

  // Utiliser les exercices directement avec les stats incluses
  const exercicesWithStats = exercices;

  // Récupérer tous les renflouements d'un exercice (pour le detail modal)
  const { data: detailExerciceRaw, isLoading: loadingDetail } = useRenfloulementExerciceDetail(
    selectedExercice?.id && tab === "exercices" ? selectedExercice.id : null
  );
  const detailExercice = useMemo(
    () => Array.isArray(detailExerciceRaw?.par_membre) ? detailExerciceRaw.par_membre : [],
    [detailExerciceRaw]
  );

  // Renflouements membre sélectionné
  const { data: renflouementHistoryRaw, isLoading: loadingMembreRenflouement } = useRenfloulementHistoryByMember(
    selectedMember?.id && tab === "membres" ? selectedMember.id : null
  );
  const renflouementsMembre = useMemo(
    () => Array.isArray(renflouementHistoryRaw?.renflouements_par_exercice)
      ? renflouementHistoryRaw.renflouements_par_exercice
      : [],
    [renflouementHistoryRaw]
  );
  const { data: savingsAvailableRaw } = useSavingsAvailable(paymentData.memberId || null);

  // Stats exercice - utiliser directement depuis l'objet exercice
  const statsExercice = useMemo(() => {
    if (selectedExercice?.renflouement_stats) {
      return selectedExercice.renflouement_stats;
    }
    return { montant_total_du: 0, montant_total_paye: 0, montant_total_restant: 0 };
  }, [selectedExercice]);

  // Stats membre (cumul)
  const statsMembre = useMemo(() => {
    if (renflouementHistoryRaw?.cumuls_totaux) {
      return {
        montant_total_du: renflouementHistoryRaw.cumuls_totaux.total_du || 0,
        montant_total_paye: renflouementHistoryRaw.cumuls_totaux.total_paye || 0,
        montant_total_restant: renflouementHistoryRaw.cumuls_totaux.montant_restant || 0,
      };
    }

    let totalDu = 0;
    let totalPaye = 0;
    renflouementsMembre.forEach((item: any) => {
      totalDu += item.montant_du || item.totals?.montant_du || 0;
      totalPaye += item.montant_paye || item.totals?.montant_paye || 0;
    });
    return {
      montant_total_du: totalDu,
      montant_total_paye: totalPaye,
      montant_total_restant: totalDu - totalPaye,
    };
  }, [renflouementHistoryRaw, renflouementsMembre]);

  // Conversion detailExercice au format expected
  const membersForDetailModal = useMemo(() => {
    return detailExercice.map((item: any) => ({
      membre: item.membre || item.membre_info || {
        nom_complet: item.membre_nom,
        numero_membre: item.membre_numero,
        statut: item.membre_statut,
        id: item.membre_id,
      },
      montants: {
        montant_du: item.renflouement?.montant_du || item.totals?.montant_du || 0,
        montant_paye: item.renflouement?.montant_paye || item.totals?.montant_paye || 0,
      },
      renflouement: item.renflouement,
      paiements: item.paiements || item.paiements_details || [],
    }));
  }, [detailExercice]);

  // Filtrés (tab exercices ou membres)
  const filteredExercices = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return exercicesWithStats || [];
    return exercicesWithStats?.filter((e) => e.nom.toLowerCase().includes(q)) || [];
  }, [exercicesWithStats, search]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.utilisateur?.nom_complet || "").toLowerCase().includes(q) ||
        (m.numero_membre || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const memberRenflouementTotals = useMemo(() => {
    const map = aggregateRenflouementsByMember(renflouementsAll);

    const cachedHistories = queryClient.getQueriesData<any>({
      queryKey: ["renflouement-history-member"],
    });
    cachedHistories.forEach(([, history]) => {
      const memberId = history?.membre?.id;
      const total = getTotalFromMemberHistory(history);
      if (memberId && total != null) {
        map.set(String(memberId), total);
      }
    });

    if (renflouementHistoryRaw?.membre?.id) {
      const total = getTotalFromMemberHistory(renflouementHistoryRaw);
      if (total != null) {
        map.set(String(renflouementHistoryRaw.membre.id), total);
      }
    }

    return map;
  }, [renflouementsAll, queryClient, renflouementHistoryRaw]);

  const paginatedItems = useMemo(() => {
    const list = tab === "exercices" ? filteredExercices : filteredMembers;
    return list.slice(0, displayedItems);
  }, [tab, filteredExercices, filteredMembers, displayedItems]);

  const hasMore = useMemo(() => {
    const list = tab === "exercices" ? filteredExercices : filteredMembers;
    return displayedItems < list.length;
  }, [tab, filteredExercices, filteredMembers, displayedItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["exercises"] }),
      queryClient.refetchQueries({ queryKey: ["members"] }),
      queryClient.refetchQueries({ queryKey: ["renflouements"] }),
      queryClient.refetchQueries({ queryKey: ["renflouement-history-member"] }),
    ]);
    setRefreshing(false);
  };

  const handleExerciceSelect = (exe: any) => {
    setSelectedExercice(exe);
    setSelectedMember(null);
    setShowDetailModal(true);
  };

  const handleMemberSelect = (mem: any) => {
    setSelectedMember(mem);
    setSelectedExercice(null);
    setShowDetailModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentData({});
    setPaymentAmount("");
    setPaymentNotes("");
  };

  const openPaymentModal = (item: any) => {
    const renflouement = resolveRenflouement(item);
    const member = item.membre || renflouementHistoryRaw?.membre || item.membre_info || item;
    const memberId = resolveMemberId(item) || renflouementHistoryRaw?.membre?.id || null;
    const montantDu = item.montants?.montant_du || renflouement?.montant_du || item.montant_du || 0;
    const montantPaye = item.montants?.montant_paye || renflouement?.montant_paye || item.montant_paye || 0;
    const restant = Math.max(0, montantDu - montantPaye);

    setPaymentData({ member, renflouement, memberId });
    setPaymentAmount(String(restant));
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = (method: PaymentMethod) => {
    const montant = Number(paymentAmount);
    const renflouementId = paymentData.renflouement?.id;
    const montantDu = paymentData.renflouement?.montant_du || 0;
    const montantPaye = paymentData.renflouement?.montant_paye || 0;
    const montantRestant = Math.max(0, montantDu - montantPaye);
    const epargneDisponible = savingsAvailableRaw?.epargne_disponible ?? 0;

    if (!renflouementId) {
      Alert.alert("Erreur", "Impossible de trouver le renflouement à payer.");
      return;
    }

    if (!paymentAmount.trim() || isNaN(montant) || montant <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un montant valide.");
      return;
    }

    if (montant > montantRestant) {
      Alert.alert(
        "Erreur",
        `Le montant saisi (${formatCurrency(montant)}) dépasse le montant restant à payer (${formatCurrency(montantRestant)}).`
      );
      return;
    }

    if (method === "savings" && montant > epargneDisponible) {
      Alert.alert(
        "Erreur",
        `Le montant saisi (${formatCurrency(montant)}) dépasse l'épargne disponible (${formatCurrency(epargneDisponible)}).`
      );
      return;
    }

    const mutation = method === "savings" ? payRenflouement : createPayment;
    const payload =
      method === "savings"
        ? {
            renflouementId,
            montant,
            notes: paymentNotes.trim() || undefined,
          }
        : {
            renflouement: renflouementId,
            montant,
            notes: paymentNotes.trim() || undefined,
          };

    mutation.mutate(
      payload,
      {
        onSuccess: () => {
          closePaymentModal();
          queryClient.invalidateQueries({ queryKey: ["renflouement-exercice-detail"] });
          queryClient.invalidateQueries({ queryKey: ["renflouement-history-member"] });
          queryClient.invalidateQueries({ queryKey: ["renflouements"] });
          queryClient.invalidateQueries({ queryKey: ["renflouement-payments"] });
          queryClient.invalidateQueries({ queryKey: ["members"] });
          queryClient.invalidateQueries({ queryKey: ["savings-available", paymentData.memberId] });
          Alert.alert(
            "Succès",
            method === "savings"
              ? "Paiement de renflouement effectué avec l'épargne."
              : "Paiement de renflouement enregistré."
          );
        },
        onError: (error: any) => {
          const errMsg =
            error?.response?.data?.error ||
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            "Impossible d'enregistrer le paiement.";
          Alert.alert("Erreur", errMsg);
        },
      }
    );
  };

  const currentSavingsAvailable = savingsAvailableRaw?.epargne_disponible ?? 0;
  const isSubmittingPayment = createPayment.isPending || payRenflouement.isPending;
  const listCount = tab === "exercices" ? filteredExercices.length : filteredMembers.length;

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL_DARK} />

      <ScreenHeader
        title="Renflouements"
        subtitle="Gestion par exercice ou par membre"
        icon="refresh-circle"
        topInset={insets.top}
        rightSlot={
          <View style={styles.notificationWrap}>
            <NotificationButton />
          </View>
        }
      />

      <View style={styles.contentArea}>
        <View style={styles.segmentedTabs}>
          <TouchableOpacity
            style={[styles.segmentTab, tab === "exercices" && styles.segmentTabActive]}
            onPress={() => {
              setTab("exercices");
              setSearch("");
              setDisplayedItems(ITEMS_PER_PAGE);
            }}
          >
            <Ionicons name="folder-outline" size={16} color={tab === "exercices" ? "white" : COLORS.textSecondary} />
            <Text style={[styles.segmentTabText, tab === "exercices" && styles.segmentTabTextActive]}>
              Par exercices
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, tab === "membres" && styles.segmentTabActive]}
            onPress={() => {
              setTab("membres");
              setSearch("");
              setDisplayedItems(ITEMS_PER_PAGE);
            }}
          >
            <Ionicons name="people-outline" size={16} color={tab === "membres" ? "white" : COLORS.textSecondary} />
            <Text style={[styles.segmentTabText, tab === "membres" && styles.segmentTabTextActive]}>
              Par membres
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.listMetaRow}>
            <Text style={styles.listMetaText}>
              {listCount}{" "}
              {tab === "exercices"
                ? `exercice${listCount > 1 ? "s" : ""}`
                : `membre${listCount > 1 ? "s" : ""}`}
            </Text>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={tab === "exercices" ? "Rechercher un exercice..." : "Rechercher un membre..."}
              placeholderTextColor={COLORS.textLight}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Liste */}
      {tab === "exercices" ? (
        // TAB EXERCICES
        loadingExercices ? (
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Chargement des exercices...</Text>
          </View>
        ) : exercicesWithStats.length === 0 ? (
          <View style={styles.centerFlex}>
            <Ionicons name="folder-open-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun exercice</Text>
          </View>
        ) : (
          <FlatList
            data={paginatedItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.xl }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            renderItem={({ item }) => (
              <ExerciceSimpleCard item={item} onPress={() => handleExerciceSelect(item)} />
            )}
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setDisplayedItems((p) => p + ITEMS_PER_PAGE)}
                >
                  <LinearGradient colors={[TEAL, TEAL2]} style={styles.loadMoreGrad}>
                    <Text style={styles.loadMoreText}>Voir plus</Text>
                    <Ionicons name="chevron-down" size={18} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : null
            }
          />
        )
      ) : (
        // TAB MEMBRES
        loadingMembers || loadingRenflouements ? (
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Chargement des membres...</Text>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.centerFlex}>
            <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun membre</Text>
          </View>
        ) : (
          <FlatList
            data={paginatedItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.xl }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            renderItem={({ item }) => (
              <MemberSimpleCard
                item={item}
                totalRenflouement={memberRenflouementTotals.get(String(item.id)) || 0}
                onPress={() => handleMemberSelect(item)}
              />
            )}
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setDisplayedItems((p) => p + ITEMS_PER_PAGE)}
                >
                  <LinearGradient colors={[TEAL, TEAL2]} style={styles.loadMoreGrad}>
                    <Text style={styles.loadMoreText}>Voir plus</Text>
                    <Ionicons name="chevron-down" size={18} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : null
            }
          />
        )
      )}
      </View>

      {/* Detail Modal - Exercice */}
      <DetailModal
        visible={showDetailModal && selectedExercice !== null}
        title={selectedExercice?.nom || ""}
        subtitle="Détail des renflouements par membre"
        stats={statsExercice}
        members={membersForDetailModal}
        isLoading={loadingDetail}
        isMemberView={false}
        onClose={() => setShowDetailModal(false)}
        onSelectMember={(member) => {
          setShowDetailModal(false);
          openPaymentModal(member);
        }}
      />

      {/* Detail Modal - Membre */}
      <DetailModal
        visible={showDetailModal && selectedMember !== null}
        title={selectedMember?.utilisateur?.nom_complet || selectedMember?.nom_complet || ""}
        subtitle={selectedMember?.numero_membre || "Historique des renflouements"}
        stats={statsMembre}
        members={renflouementsMembre}
        isLoading={loadingMembreRenflouement}
        isMemberView={true}
        onClose={() => setShowDetailModal(false)}
        onSelectMember={(member) => {
          setShowDetailModal(false);
          openPaymentModal(member);
        }}
      />

      <Modal visible={showPaymentModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.paymentOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={styles.paymentBackdrop} activeOpacity={1} onPress={closePaymentModal} />
          <View style={[styles.paymentModalContainer, { paddingBottom: insets.bottom }]}>
            <LinearGradient colors={[TEAL, TEAL2, TEAL_DARK]} style={styles.paymentModalHeader}>
              <BackButton onPress={closePaymentModal} label="Fermer" />
              <View style={styles.paymentHeaderText}>
                <Text style={styles.paymentModalTitle}>Paiement de renflouement</Text>
                <Text style={styles.paymentModalSubtitle}>
                  {paymentData.member?.nom_complet || paymentData.member?.numero_membre || "—"}
                </Text>
              </View>
            </LinearGradient>

            <ScrollView style={styles.paymentModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.paymentSummaryRow}>
                <View style={styles.paymentSummaryCard}>
                  <Text style={styles.paymentSummaryLabel}>Montant dû</Text>
                  <Text style={styles.paymentSummaryValue}>
                    {formatCurrency(paymentData.renflouement?.montant_du || 0)}
                  </Text>
                </View>
                <View style={styles.paymentSummaryCard}>
                  <Text style={styles.paymentSummaryLabel}>Déjà payé</Text>
                  <Text style={[styles.paymentSummaryValue, { color: COLORS.success }]}>
                    {formatCurrency(paymentData.renflouement?.montant_paye || 0)}
                  </Text>
                </View>
              </View>

              <View style={[styles.paymentSummaryCard, styles.paymentSavingsCard]}>
                <View style={styles.paymentSavingsHeader}>
                  <Ionicons name="wallet-outline" size={18} color={TEAL} />
                  <Text style={styles.paymentSummaryLabel}>Épargne disponible</Text>
                </View>
                <Text style={[styles.paymentSummaryValue, { color: TEAL }]}>
                  {formatCurrency(currentSavingsAvailable)}
                </Text>
              </View>

              <Text style={styles.paymentLabel}>Montant à payer</Text>
              <TextInput
                style={styles.paymentInput}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Entrez le montant"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.paymentLabel}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.paymentInput, styles.paymentNotes]}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Notes sur le paiement"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </ScrollView>

            <View style={styles.paymentModalFooter}>
              <TouchableOpacity style={styles.paymentCancelButton} onPress={closePaymentModal}>
                <Text style={styles.paymentCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentSavingsButton, isSubmittingPayment && styles.paymentButtonDisabled]}
                onPress={() => handleSubmitPayment("savings")}
                disabled={isSubmittingPayment}
              >
                <Ionicons name="wallet" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.paymentSavingsText}>
                  {payRenflouement.isPending ? "Paiement..." : "Avec épargne"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentSubmitButton, isSubmittingPayment && styles.paymentButtonDisabled]}
                onPress={() => handleSubmitPayment("standard")}
                disabled={isSubmittingPayment}
              >
                <Ionicons name="card" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.paymentSubmitText}>
                  {createPayment.isPending ? "Paiement..." : "Payer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// 🎨 STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  contentArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // ── Header ──
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    elevation: 6,
    shadowColor: TEAL_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerContent: {
    alignItems: "center",
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
  },
  notificationWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  backButtonWithLabel: {
    width: "auto",
    minWidth: 40,
    paddingHorizontal: SPACING.sm,
    gap: 2,
  },
  backButtonLabel: {
    color: "white",
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
  },

  // ── Segmented Tabs ──
  segmentedTabs: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: TEAL,
    elevation: 2,
    shadowColor: TEAL_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  segmentTabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTabTextActive: {
    color: "white",
  },

  // ── Search ──
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  listMetaRow: {
    marginBottom: SPACING.xs,
  },
  listMetaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: SPACING.sm,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // ── Stats ──
  statsSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    width: "48.5%",
    flexGrow: 1,
    flexBasis: "47%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    marginTop: 2,
  },

  // ── Simple Cards ──
  simpleCard: {
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  simpleCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TEAL + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  simpleCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  simpleCardDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  simpleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  simpleBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  simpleCardAmounts: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  simpleAmount: {
    alignItems: "center",
    flex: 1,
  },
  simpleAmountDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },
  simpleAmountLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  simpleAmountValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: TEAL,
  },
  simpleProgressWrap: {
    marginTop: SPACING.sm,
    gap: 4,
  },
  simpleProgressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "right",
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 4,
  },
  statusPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  memberCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  smallAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  smallInitials: {
    color: "white",
    fontWeight: "800",
    fontSize: FONT_SIZES.sm,
  },
  memberCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: SPACING.sm,
  },
  memberTotalLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  memberTotalValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
  },

  // ── Detail Cards ──
  detailCard: {
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    flexDirection: "row",
  },
  detailStripe: {
    width: 4,
  },
  detailBody: {
    flex: 1,
    padding: SPACING.md,
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TEAL + "12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  detailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  detailInitials: {
    color: "white",
    fontWeight: "800",
    fontSize: FONT_SIZES.sm,
  },
  detailName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  detailNumero: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  detailPercent: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "800",
  },
  detailAmounts: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailAmount: {
    alignItems: "center",
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
  },
  detailProgress: {
    marginTop: SPACING.xs,
  },
  progressBg: {
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },

  // ── Misc ──
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  centerFlex: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  loadMoreBtn: {
    marginVertical: SPACING.md,
  },
  loadMoreGrad: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: "white",
  },

  // ── Payment Modal ──
  paymentOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  paymentBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  paymentModalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: "92%",
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  paymentModalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  paymentHeaderText: {
    marginTop: SPACING.sm,
  },
  paymentModalTitle: {
    color: "white",
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
  },
  paymentModalSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  paymentModalBody: {
    padding: SPACING.lg,
    maxHeight: 380,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  paymentSummaryCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  paymentSavingsCard: {
    marginBottom: SPACING.md,
  },
  paymentSavingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  paymentSummaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  paymentSummaryValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: "800",
  },
  paymentLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
    fontWeight: "600",
  },
  paymentInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  paymentNotes: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  paymentModalFooter: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FAFAFA",
  },
  paymentCancelButton: {
    flex: 0.8,
    backgroundColor: "#F1F5F9",
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  paymentSubmitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  paymentSavingsButton: {
    flex: 1.1,
    backgroundColor: TEAL,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  paymentSavingsText: {
    color: "white",
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
  paymentSubmitText: {
    color: "white",
    fontWeight: "700",
    fontSize: FONT_SIZES.sm,
  },
});
