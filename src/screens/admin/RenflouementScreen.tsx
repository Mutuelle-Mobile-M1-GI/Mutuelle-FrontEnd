import React, { useState, useMemo } from "react";
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
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuthContext } from "../../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import NotificationButton from "../../components/NotificationButton";
import {
  useRenfloulementExerciceDetail,
  useRenfloulementHistoryByMember,
  usePayRenflouementWithSavings,
} from "../../hooks/useRenflouement";
import { useExercises } from "../../hooks/useListData";
import { useMembers } from "../../hooks/useMember";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getInitials, normalizeArray } from "../../utils/helpers";

const { width } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const TEAL = "#14B8A6";
const TEAL2 = "#0D9488";

type TabView = "exercices" | "membres";

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
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon as any} size={14} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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

  return (
    <TouchableOpacity style={styles.simpleCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.simpleCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.simpleCardTitle}>{item.nom}</Text>
          <Text style={styles.simpleCardDate}>
            {new Date(item.date_debut).toLocaleDateString("fr-FR")}
          </Text>
        </View>
        <View style={[styles.simpleBadge, { backgroundColor: item.statut === "TERMINE" ? "#F3F4F615" : "#4361EE15" }]}>
          <Text style={[styles.simpleBadgeText, { color: item.statut === "TERMINE" ? "#666" : "#4361EE" }]}>
            {item.statut}
          </Text>
        </View>
      </View>

      <View style={styles.simpleCardAmounts}>
        <View style={styles.simpleAmount}>
          <Text style={styles.simpleAmountLabel}>A collecter</Text>
          <Text style={styles.simpleAmountValue}>{formatCurrency(totalDu)}</Text>
        </View>
        <View style={styles.simpleAmount}>
          <Text style={styles.simpleAmountLabel}>Collecte</Text>
          <Text style={[styles.simpleAmountValue, { color: COLORS.success }]}>
            {formatCurrency(totalPaye)}
          </Text>
        </View>
        <View style={styles.simpleAmount}>
          <Text style={styles.simpleAmountLabel}>Restant</Text>
          <Text style={[styles.simpleAmountValue, { color: restant > 0 ? COLORS.error : COLORS.success }]}>
            {formatCurrency(restant)}
          </Text>
        </View>
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
    <TouchableOpacity style={styles.simpleCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.memberCardTop}>
        <LinearGradient colors={[TEAL, TEAL2]} style={styles.smallAvatar}>
          <Text style={styles.smallInitials}>{getInitials(item.utilisateur?.nom_complet || "")}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.simpleCardTitle}>{item.utilisateur?.nom_complet}</Text>
          <Text style={styles.simpleCardDate}>{item.numero_membre}</Text>
          <Text style={[styles.simpleCardDate, { color: item.statut === "EN_REGLE" ? COLORS.success : COLORS.warning }]}>
            {item.statut}
          </Text>
        </View>
      </View>
      <View style={styles.memberCardFooter}>
        <Text style={styles.memberTotalLabel}>Total renflouements :</Text>
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
  stats,
  members,
  isLoading,
  isMemberView = false,
  onClose,
  onSelectMember,
}: DetailModalProps) => {
  const [search, setSearch] = useState("");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) =>
      (m.membre?.nom_complet || m.utilisateur?.nom_complet || "").toLowerCase().includes(q) ||
      (m.membre?.numero_membre || m.numero_membre || "").toLowerCase().includes(q)
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
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
        </View>

        {/* Stats vertical */}
        {stats && (
          <View style={styles.statsVertical}>
            <View style={styles.statsVerticalGrid}>
              <StatCard
                title="A collecter"
                value={formatCurrency(stats.montant_total_du || 0)}
                icon="cash"
                color={TEAL}
              />
              <StatCard
                title="Collecte"
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

        {/* Recherche */}
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

        {isLoading ? (
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.centerFlex}>
            <Text style={styles.emptyText}>Aucun membre</Text>
          </View>
        ) : (
          <FlatList
            data={paginatedMembers}
            keyExtractor={(item, idx) => String(item.membre?.id || item.id || idx)}
            contentContainerStyle={styles.listContent}
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
          <Text style={[styles.detailPercent, { color }]}>
            {restant <= 0 ? "✅" : `${progress.toFixed(0)}%`}
          </Text>
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

  return (
    <TouchableOpacity style={styles.detailCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.detailStripe, { backgroundColor: color }]} />
      <View style={styles.detailBody}>
        <View style={styles.detailTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>{cause}</Text>
            <Text style={styles.detailNumero}>{formatDate(item.date_creation)}</Text>
          </View>
          <Text style={[styles.detailPercent, { color }]}>
            {restant <= 0 ? "✅" : `${progress.toFixed(0)}%`}
          </Text>
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
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

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
  const [paymentData, setPaymentData] = useState<{ member?: any; renflouement?: any }>({});
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const payRenflouement = usePayRenflouementWithSavings();

  // Données
  const { data: exercicesRaw, isLoading: loadingExercices } = useExercises();
  const { data: membersRaw, isLoading: loadingMembers } = useMembers();

  const exercices = useMemo(() => normalizeArray(exercicesRaw), [exercicesRaw]);
  const members = useMemo(() => normalizeArray(membersRaw), [membersRaw]);

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

  // Calcul total renflouement par membre - initialiser simplement, fetcher sur demande
  const memberRenflouementTotals = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const totalDu =
        m.renflouement?.total_renflouement_du ||
        m.renflouement?.montant_du ||
        m.total_renflouement_du ||
        m.total_du ||
        0;
      map.set(m.id, totalDu);
    });
    return map;
  }, [members]);

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
    const renflouement = item.renflouement || item;
    const member = item.membre || item.exercice || item.membre_info || item;
    const montantDu = item.montants?.montant_du || renflouement?.montant_du || item.montant_du || 0;
    const montantPaye = item.montants?.montant_paye || renflouement?.montant_paye || item.montant_paye || 0;
    const restant = Math.max(0, montantDu - montantPaye);

    setPaymentData({ member, renflouement });
    setPaymentAmount(String(restant));
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = () => {
    const montant = Number(paymentAmount);
    const renflouementId = paymentData.renflouement?.id;
    const montantDu = paymentData.renflouement?.montant_du || 0;
    const montantPaye = paymentData.renflouement?.montant_paye || 0;
    const montantRestant = Math.max(0, montantDu - montantPaye);

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

    payRenflouement.mutate(
      {
        renflouementId,
        montant,
        notes: paymentNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          closePaymentModal();
          queryClient.invalidateQueries({ queryKey: ["renflouement-exercice-detail"] });
          queryClient.invalidateQueries({ queryKey: ["renflouement-history-member"] });
          Alert.alert("Succès", "Paiement de renflouement enregistré.");
        },
        onError: (error: any) => {
          const errMsg =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            "Impossible d'enregistrer le paiement.";
          Alert.alert("Erreur", errMsg);
        },
      }
    );
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: StatusBar.currentHeight }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Renflouements</Text>
          <Text style={styles.screenSubtitle}>Gestion par exercice ou membre</Text>
        </View>
        <NotificationButton />
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === "exercices" && styles.tabActive]}
          onPress={() => {
            setTab("exercices");
            setSearch("");
            setDisplayedItems(ITEMS_PER_PAGE);
          }}
        >
          <Ionicons name="folder-outline" size={18} color={tab === "exercices" ? TEAL : COLORS.textSecondary} />
          <Text style={[styles.tabText, tab === "exercices" && styles.tabTextActive]}>Par exercices</Text>
        </TouchableOpacity>

        <View style={styles.tabDivider} />

        <TouchableOpacity
          style={[styles.tab, tab === "membres" && styles.tabActive]}
          onPress={() => {
            setTab("membres");
            setSearch("");
            setDisplayedItems(ITEMS_PER_PAGE);
          }}
        >
          <Ionicons name="people-outline" size={18} color={tab === "membres" ? TEAL : COLORS.textSecondary} />
          <Text style={[styles.tabText, tab === "membres" && styles.tabTextActive]}>Par membres</Text>
        </TouchableOpacity>
      </View>

      {/* Recherche */}
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

      {/* Liste */}
      {tab === "exercices" ? (
        // TAB EXERCICES
        loadingExercices ? (
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : exercicesWithStats.length === 0 ? (
          <View style={styles.centerFlex}>
            <Text style={styles.emptyText}>Aucun exercice</Text>
          </View>
        ) : (
          <FlatList
            data={paginatedItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
        loadingMembers ? (
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.centerFlex}>
            <Text style={styles.emptyText}>Aucun membre</Text>
          </View>
        ) : (
          <FlatList
            data={paginatedItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              // Calculer total du renflouement pour ce membre si on a les données
              const totalRenflouement = renflouementsMembre.length > 0 && selectedMember?.id === item.id
                ? renflouementsMembre.reduce((sum, r: any) => sum + (r.montant_du || 0), 0)
                : memberRenflouementTotals.get(item.id) || 0;
              
              return <MemberSimpleCard item={item} totalRenflouement={totalRenflouement} onPress={() => handleMemberSelect(item)} />;
            }}
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

      {/* Detail Modal - Exercice */}
      <DetailModal
        visible={showDetailModal && selectedExercice !== null}
        title={selectedExercice?.nom || ""}
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
        stats={statsMembre}
        members={renflouementsMembre.map((r: any) => ({
          ...r,
          membre: {
            nom_complet: r.cause || r.type_cause_display || "Renflouement",
            numero_membre: formatDate(r.date_creation),
          },
        }))}
        isLoading={false}
        isMemberView={true}
        onClose={() => setShowDetailModal(false)}
        onSelectMember={(member) => {
          setShowDetailModal(false);
          openPaymentModal(member);
        }}
      />

      <Modal visible={showPaymentModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentModalContainer}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Paiement de renflouement</Text>
              <TouchableOpacity onPress={closePaymentModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.paymentModalBody}>
              <Text style={styles.paymentLabel}>Membre</Text>
              <Text style={styles.paymentValue}>{paymentData.member?.nom_complet || paymentData.member?.numero_membre || "—"}</Text>
              <Text style={styles.paymentLabel}>Montant dû</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(paymentData.renflouement?.montant_du || 0)}
              </Text>
              <Text style={styles.paymentLabel}>Montant déjà payé</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(paymentData.renflouement?.montant_paye || 0)}
              </Text>
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
            </View>
            <View style={styles.paymentModalFooter}>
              <TouchableOpacity style={styles.paymentCancelButton} onPress={closePaymentModal}>
                <Text style={styles.paymentCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.paymentSubmitButton} onPress={handleSubmitPayment}>
                <Text style={styles.paymentSubmitText}>Payer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: "#F9FAFB",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  screenTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: "white",
  },
  screenSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: "#FFFFFF80",
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  backBtnText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: COLORS.text,
  },

  // ── Tabs ──
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: TEAL,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: TEAL,
  },
  tabDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },

  // ── Search ──
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // ── Stats ──
  statCard: {
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    borderLeftWidth: 3,
    marginBottom: SPACING.xs,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    marginTop: 1,
  },
  statsScroll: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  statsVertical: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: SPACING.sm,
  },
  statsVerticalGrid: {
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },

  // ── Simple Cards ──
  simpleCard: {
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  simpleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xs,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  simpleBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  simpleCardAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  simpleAmount: {
    alignItems: "center",
    flex: 1,
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
  memberCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: SPACING.xs,
  },
  memberTotalLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  memberTotalValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
  },

  // ── Detail Cards ──
  detailCard: {
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    marginBottom: SPACING.md,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
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
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  detailAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  detailPercent: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
  },
  detailAmounts: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
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
    marginTop: SPACING.sm,
  },
  progressBg: {
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Misc ──
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  centerFlex: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  loadMoreBtn: {
    marginVertical: SPACING.md,
  },
  loadMoreGrad: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
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
  paymentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  paymentModalContainer: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  paymentModalHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentModalTitle: {
    color: "white",
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
  },
  paymentModalBody: {
    padding: SPACING.lg,
  },
  paymentLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  paymentValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "700",
  },
  paymentInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  paymentNotes: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  paymentModalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  paymentCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  paymentSubmitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentSubmitText: {
    color: "white",
    fontWeight: "700",
  },
});
