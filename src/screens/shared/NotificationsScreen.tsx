import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "../../context/AuthContext";
import { useMemberDetailByUser } from "../../hooks/useMember";
import { useLoans, useRepayments } from "../../hooks/useLoan";
import { useSolidarityPayments } from "../../hooks/useSolidarity";
import { useRenflouementPayments } from "../../hooks/useRenflouement";
import { useSavings } from "../../hooks/useSaving";
import { useAssistances, useAssistancesByMember } from "../../hooks/useAssistance";
import { useInscriptionPayments } from "../../hooks/useInscription";

const BLUE = "#4361EE";
const BLUE2 = "#3A86FF";
const BLUE_DARK = "#2563EB";

type NotificationType =
  | "emprunt"
  | "remboursement"
  | "solidarite"
  | "renflouement"
  | "epargne"
  | "assistance"
  | "paiement-inscription";

interface NotificationItem {
  id: string;
  type: NotificationType;
  date: string;
  amount: number;
  memberName: string;
}

const NOTIF_VISUAL: Record<
  NotificationType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; bg: string }
> = {
  emprunt: { label: "Emprunt", icon: "trending-up", color: "#EA580C", bg: "#FFF7ED" },
  remboursement: { label: "Remboursement", icon: "arrow-down-circle", color: "#059669", bg: "#ECFDF5" },
  solidarite: { label: "Solidarité", icon: "people", color: "#0D9488", bg: "#F0FDFA" },
  renflouement: { label: "Renflouement", icon: "refresh-circle", color: "#DC2626", bg: "#FEF2F2" },
  epargne: { label: "Épargne", icon: "wallet", color: "#BE185D", bg: "#FDF2F8" },
  assistance: { label: "Assistance", icon: "heart", color: "#7C3AED", bg: "#FAF5FF" },
  "paiement-inscription": { label: "Inscription", icon: "school", color: "#0891B2", bg: "#ECFEFF" },
};

const FILTER_OPTIONS: { key: "all" | NotificationType; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "emprunt", label: "Emprunts" },
  { key: "remboursement", label: "Remboursements" },
  { key: "solidarite", label: "Solidarité" },
  { key: "renflouement", label: "Renflouements" },
  { key: "epargne", label: "Épargne" },
  { key: "assistance", label: "Assistances" },
  { key: "paiement-inscription", label: "Inscriptions" },
];

const formatMoney = (val: number | string | undefined) => {
  if (typeof val === "string") val = parseFloat(val);
  if (typeof val !== "number" || isNaN(val)) return "--";
  return `${val.toLocaleString("fr-FR")} FCFA`;
};

const formatNotificationDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (diffDays === 0) return `Aujourd'hui · ${timeStr}`;
    if (diffDays === 1) return `Hier · ${timeStr}`;
    if (diffDays < 7) return `Il y a ${diffDays} j · ${timeStr}`;

    return (
      date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
      ` · ${timeStr}`
    );
  } catch {
    return "";
  }
};

const getMemberDisplayName = (item: any) => {
  const candidates = [
    item?.membre_info?.nom_complet,
    item?.membre_nom,
    item?.membre_nom_complet,
    item?.emprunt_info?.membre_nom,
    item?.emprunt_info?.membre_info?.nom_complet,
    item?.membre?.nom_complet,
    item?.membre?.utilisateur?.nom_complet,
    item?.utilisateur?.nom_complet,
    item?.nom_complet,
  ];
  const resolved = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return resolved || "Membre";
};

const arr = (raw: any): any[] =>
  Array.isArray(raw) ? raw : raw?.results ?? raw?.assistances ?? [];

const BackButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.backButton} onPress={onPress} activeOpacity={0.85}>
    <Ionicons name="chevron-back" size={20} color="white" />
    <Text style={styles.backButtonLabel}>Retour</Text>
  </TouchableOpacity>
);

const NotificationCard = ({
  item,
  isGlobalView,
}: {
  item: NotificationItem;
  isGlobalView: boolean;
}) => {
  const visual = NOTIF_VISUAL[item.type] || NOTIF_VISUAL.epargne;
  const amount = parseFloat(String(item.amount)) || 0;

  return (
    <View style={styles.notifCard}>
      <View style={[styles.notifIconWrap, { backgroundColor: visual.bg }]}>
        <Ionicons name={visual.icon} size={20} color={visual.color} />
      </View>

      <View style={styles.notifBody}>
        <View style={styles.notifTopRow}>
          <View style={[styles.typePill, { backgroundColor: visual.bg }]}>
            <Text style={[styles.typePillText, { color: visual.color }]}>{visual.label}</Text>
          </View>
          <Text style={[styles.notifAmount, { color: visual.color }]}>{formatMoney(amount)}</Text>
        </View>

        <Text style={styles.notifMessage} numberOfLines={2}>
          {isGlobalView ? (
            <>
              <Text style={styles.notifBold}>{item.memberName}</Text>
              {" — nouvelle opération enregistrée"}
            </>
          ) : (
            <>Votre opération de {visual.label.toLowerCase()} a été enregistrée</>
          )}
        </Text>

        <Text style={styles.notifDate}>{formatNotificationDate(item.date)}</Text>
      </View>
    </View>
  );
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | NotificationType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const isMemberRole = user?.role === "MEMBRE" || user?.is_membre === true;
  const isGlobalNotificationsView = ["TRESORIER", "PRESIDENT", "SECRETAIRE_GENERALE"].includes(
    user?.role || ""
  );

  const { data: member, isLoading: loadingMember } = useMemberDetailByUser(
    isMemberRole ? user?.id : undefined
  );
  const memberParams = isMemberRole ? { membre: member?.id } : undefined;
  const renflouementPaymentParams = isMemberRole && member?.id ? { membre: member.id } : undefined;

  const { data: loansRaw, isLoading: loadingLoans } = useLoans(memberParams);
  const { data: repaymentsRaw, isLoading: loadingRepayments } = useRepayments(memberParams);
  const { data: solidarityRaw, isLoading: loadingSolidarity } = useSolidarityPayments(memberParams);
  const { data: renflouementPaymentsRaw, isLoading: loadingRenfl } =
    useRenflouementPayments(renflouementPaymentParams);
  const { data: savingsRaw, isLoading: loadingSavings } = useSavings(memberParams);
  const { data: assistancesByMemberRaw, isLoading: loadingAssistancesByMember } =
    useAssistancesByMember(isMemberRole ? member?.id || "" : "");
  const { data: assistancesRaw, isLoading: loadingAssistances } = useAssistances();
  const { data: inscriptionPaymentsRaw, isLoading: loadingInscriptionPayments } =
    useInscriptionPayments();

  const notifications = useMemo(() => {
    const items: NotificationItem[] = [];
    if (isMemberRole && !member) return items;

    const loans = arr(loansRaw);
    const loanIds = new Set(loans.map((loan: any) => loan.id));
    loans.forEach((loan: any) => {
      items.push({
        id: `notif-loan-${loan.id}`,
        type: "emprunt",
        date: loan.date_emprunt,
        amount: loan.montant_emprunte,
        memberName: getMemberDisplayName(loan),
      });
    });

    arr(repaymentsRaw).forEach((rep: any) => {
      if (loanIds.has(rep.emprunt)) {
        items.push({
          id: `notif-rep-${rep.id}`,
          type: "remboursement",
          date: rep.date_remboursement,
          amount: rep.montant,
          memberName: getMemberDisplayName(rep),
        });
      }
    });

    arr(solidarityRaw).forEach((sol: any) => {
      items.push({
        id: `notif-sol-${sol.id}`,
        type: "solidarite",
        date: sol.date_paiement,
        amount: sol.montant,
        memberName: getMemberDisplayName(sol),
      });
    });

    arr(renflouementPaymentsRaw).forEach((pay: any) => {
      items.push({
        id: `notif-renf-${pay.id}`,
        type: "renflouement",
        date: pay.date_paiement,
        amount: pay.montant,
        memberName: pay.membre_nom || getMemberDisplayName(pay),
      });
    });

    arr(savingsRaw).forEach((saving: any) => {
      items.push({
        id: `notif-sav-${saving.id}`,
        type: "epargne",
        date: saving.date_transaction || saving.date_creation,
        amount: saving.montant,
        memberName: getMemberDisplayName(saving),
      });
    });

    const assistances = arr(assistancesRaw);
    const memberAssistances = arr(assistancesByMemberRaw);
    const targetAssistances = isMemberRole ? memberAssistances : assistances;
    targetAssistances.forEach((assistance: any) => {
      items.push({
        id: `notif-asst-${assistance.id}`,
        type: "assistance",
        date: assistance.date_paiement || assistance.date_demande,
        amount: assistance.montant,
        memberName: getMemberDisplayName(assistance),
      });
    });

    const inscriptionPayments = arr(inscriptionPaymentsRaw);
    const targetInscriptionPayments = isMemberRole
      ? inscriptionPayments.filter((payment: any) => payment.membre === member?.id)
      : inscriptionPayments;
    targetInscriptionPayments.forEach((payment: any) => {
      items.push({
        id: `notif-insc-${payment.id}`,
        type: "paiement-inscription",
        date: payment.date_paiement,
        amount: parseFloat(payment.montant),
        memberName: getMemberDisplayName(payment),
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    loansRaw,
    repaymentsRaw,
    renflouementPaymentsRaw,
    solidarityRaw,
    savingsRaw,
    assistancesRaw,
    assistancesByMemberRaw,
    inscriptionPaymentsRaw,
    isMemberRole,
    member,
  ]);

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeFilter !== "all") {
      list = list.filter((item) => item.type === activeFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.memberName.toLowerCase().includes(q) ||
        NOTIF_VISUAL[item.type].label.toLowerCase().includes(q) ||
        formatMoney(item.amount).toLowerCase().includes(q)
    );
  }, [notifications, activeFilter, search]);

  const isLoading =
    loadingMember ||
    loadingLoans ||
    loadingRepayments ||
    loadingSolidarity ||
    loadingRenfl ||
    loadingSavings ||
    loadingAssistances ||
    loadingAssistancesByMember ||
    loadingInscriptionPayments;

  const markAllAsRead = useCallback(async () => {
    const storageKey = isMemberRole
      ? `last_read_count_${member?.id}`
      : `last_read_count_global_${user?.id}`;
    await AsyncStorage.setItem(storageKey, notifications.length.toString());
  }, [isMemberRole, member?.id, user?.id, notifications.length]);

  useFocusEffect(
    useCallback(() => {
      if (notifications.length > 0) {
        markAllAsRead();
      }
    }, [notifications.length, markAllAsRead])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["loans"] }),
        queryClient.invalidateQueries({ queryKey: ["repayments"] }),
        queryClient.invalidateQueries({ queryKey: ["solidarity-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["renflouement-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["savings"] }),
        queryClient.invalidateQueries({ queryKey: ["assistances"] }),
        queryClient.invalidateQueries({ queryKey: ["inscription-payments"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une notification..."
          placeholderTextColor={COLORS.textLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.listMeta}>
        {filteredNotifications.length} notification{filteredNotifications.length > 1 ? "s" : ""}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter.key;
          const count =
            filter.key === "all"
              ? notifications.length
              : notifications.filter((n) => n.type === filter.key).length;
          if (filter.key !== "all" && count === 0) return null;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter.label}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE_DARK} />

      <LinearGradient
        colors={[BLUE, BLUE2, BLUE_DARK]}
        style={[styles.headerGradient, { paddingTop: insets.top + SPACING.sm }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <TouchableOpacity style={styles.markReadBtn} onPress={markAllAsRead} activeOpacity={0.85}>
            <Ionicons name="checkmark-done" size={18} color={BLUE} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="notifications" size={28} color="white" />
          </View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {isGlobalNotificationsView
              ? "Activité récente de la mutuelle"
              : "Vos opérations et mises à jour"}
          </Text>
          {!isLoading && notifications.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{notifications.length} au total</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.centerStateText}>Chargement des notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={40} color={COLORS.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtext}>
            {isGlobalNotificationsView
              ? "Les opérations enregistrées pour les membres apparaîtront ici."
              : "Vos opérations et alertes importantes s'afficheront ici."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard item={item} isGlobalView={isGlobalNotificationsView} />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + SPACING.xl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />
          }
          ListEmptyComponent={
            <View style={styles.emptyFilterState}>
              <Ionicons name="search-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyFilterText}>Aucun résultat pour ce filtre</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    elevation: 6,
    shadowColor: BLUE_DARK,
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  backButtonLabel: {
    color: "white",
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  markReadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
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
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textAlign: "center",
  },
  headerBadge: {
    marginTop: SPACING.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerBadgeText: {
    color: "white",
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  listHeader: {
    marginBottom: SPACING.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    paddingVertical: 0,
  },
  listMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  filtersRow: {
    gap: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: "white",
  },

  notifCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    gap: SPACING.md,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.md,
  },
  typePillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  notifAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
    flexShrink: 0,
  },
  notifMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  notifBold: {
    fontWeight: "700",
    color: COLORS.text,
  },
  notifDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  centerStateText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyFilterState: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyFilterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
});
