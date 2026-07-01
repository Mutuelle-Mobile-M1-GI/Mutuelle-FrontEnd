/*import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function NotificationsScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header }
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Ionicons name="checkmark-done-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Empty State }
      <View style={styles.emptyState}>
        <Ionicons name="notifications-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>Aucune notification</Text>
        <Text style={styles.emptySubtext}>
          Vous recevrez ici les notifications importantes de la mutuelle
        </Text>
      </View>
    </View>
  );
}*/

/*const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 22,
  },
});*/


import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks de données (identiques à l'historique)
import { useAuthContext } from "../../context/AuthContext";
import { useMemberDetailByUser } from "../../hooks/useMember";
import { useLoans, useRepayments } from "../../hooks/useLoan";
import { useSolidarityPayments } from "../../hooks/useSolidarity";
import { useRenflouements } from "../../hooks/useRenflouement";
import { useSavings } from "../../hooks/useSaving";
import { useAssistances, useAssistancesByMember } from "../../hooks/useAssistance";
import { useInscriptionPayments } from "../../hooks/useInscription";

// Formatage d'argent basique
const formatMoney = (val: number | string | undefined) => {
  if (typeof val === "string") val = parseFloat(val);
  if (typeof val !== "number" || isNaN(val)) return "--";
  return `${val.toLocaleString("fr-FR")} FCFA`;
};

// Formatage intelligent de la date et de l'heure
const formatNotificationDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (diffDays === 0) return `Aujourd'hui à ${timeStr}`;
    if (diffDays === 1) return `Hier à ${timeStr}`;
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + ` à ${timeStr}`;
  } catch {
    return "";
  }
};

// Configuration des libellés (pour accorder correctement la phrase)
const NOTIF_CONFIG = {
  emprunt: "votre demande d'Emprunt",
  remboursement: "votre Remboursement",
  solidarite: "votre paiement de Solidarité",
  renflouement: "votre paiement de Renflouement",
  epargne: "votre dépôt d'Épargne",
  retraite: "votre retrait d'Épargne",
  assistance: "votre allocation d'Assistance",
  "paiement-inscription": "votre Paiement Inscription",
};
const NOTIF_CONFIG_admin = {
  emprunt: "de demande d'Emprunt",
  remboursement: " de Remboursement",
  solidarite: "de paiement de Solidarité",
  renflouement: "de paiement de Renflouement",
  epargne: "de dépôt d'Épargne",
  retraite: "de retrait d'Épargne",
  assistance: "de allocation d'Assistance",
  "paiement-inscription": "de Paiement Inscription",
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
  return resolved || "Membre non défini";
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();

  const isMemberRole = user?.role === "MEMBRE" || user?.is_membre === true;
  const isGlobalNotificationsView = ["TRESORIER", "PRESIDENT", "SECRETAIRE_GENERALE"].includes(user?.role || "");

  const { data: member, isLoading: loadingMember } = useMemberDetailByUser(isMemberRole ? user?.id : undefined);
  const memberParams = isMemberRole ? { membre: member?.id } : undefined;

  const { data: loansRaw, isLoading: loadingLoans } = useLoans(memberParams);
  const { data: repaymentsRaw, isLoading: loadingRepayments } = useRepayments(memberParams);
  const { data: solidarityRaw, isLoading: loadingSolidarity } = useSolidarityPayments(memberParams);
  const { data: renflouementRaw, isLoading: loadingRenfl } = useRenflouements(memberParams);
  const { data: savingsRaw, isLoading: loadingSavings } = useSavings(memberParams);
  const { data: assistancesByMemberRaw, isLoading: loadingAssistancesByMember } = useAssistancesByMember(isMemberRole ? member?.id || "" : "");
  const { data: assistancesRaw, isLoading: loadingAssistances } = useAssistances();
  const { data: inscriptionPaymentsRaw, isLoading: loadingInscriptionPayments } = useInscriptionPayments();

  const notifications = useMemo(() => {
    const items: any[] = [];
    if (isMemberRole && !member) return items;

    const loans = Array.isArray(loansRaw) ? (loansRaw as any[]) : ((loansRaw as any)?.results ?? []);
    const loanIds = new Set(loans.map((loan: any) => loan.id));
    loans.forEach((loan: any) => {
      items.push({ id: `notif-loan-${loan.id}`, type: "emprunt", date: loan.date_emprunt, amount: loan.montant_emprunte, memberName: getMemberDisplayName(loan) });
    });

    const repayments = Array.isArray(repaymentsRaw) ? (repaymentsRaw as any[]) : ((repaymentsRaw as any)?.results ?? []);
    repayments.forEach((rep: any) => {
      if (loanIds.has(rep.emprunt)) {
        items.push({ id: `notif-rep-${rep.id}`, type: "remboursement", date: rep.date_remboursement, amount: rep.montant, memberName: getMemberDisplayName(rep) });
      }
    });

    const solidarites = Array.isArray(solidarityRaw) ? (solidarityRaw as any[]) : ((solidarityRaw as any)?.results ?? []);
    solidarites.forEach((sol: any) => {
      items.push({ id: `notif-sol-${sol.id}`, type: "solidarite", date: sol.date_paiement, amount: sol.montant, memberName: getMemberDisplayName(sol) });
    });

    const renflouements = Array.isArray(renflouementRaw) ? (renflouementRaw as any[]) : ((renflouementRaw as any)?.results ?? []);
    renflouements.forEach((renf: any) => {
      (renf.paiements_details || []).forEach((pay: any) => {
        items.push({ id: `notif-renf-${pay.id}`, type: "renflouement", date: pay.date_paiement, amount: pay.montant, memberName: getMemberDisplayName(pay) || getMemberDisplayName(renf) });
      });
    });

    const savings = Array.isArray(savingsRaw) ? (savingsRaw as any[]) : ((savingsRaw as any)?.results ?? []);
    savings.forEach((saving: any) => {
      items.push({ id: `notif-sav-${saving.id}`, type: "epargne", date: saving.date_transaction || saving.date_creation, amount: saving.montant, memberName: getMemberDisplayName(saving) });
    });

    const assistances = Array.isArray(assistancesRaw) ? (assistancesRaw as any[]) : ((assistancesRaw as any)?.assistances ?? []);
    const memberAssistances = Array.isArray(assistancesByMemberRaw) ? (assistancesByMemberRaw as any[]) : ((assistancesByMemberRaw as any)?.assistances ?? []);
    const targetAssistances = isMemberRole ? memberAssistances : assistances;
    targetAssistances.forEach((assistance: any) => {
      items.push({ id: `notif-asst-${assistance.id}`, type: "assistance", date: assistance.date_paiement || assistance.date_demande, amount: assistance.montant, memberName: getMemberDisplayName(assistance) });
    });

    const inscriptionPayments = Array.isArray(inscriptionPaymentsRaw) ? (inscriptionPaymentsRaw as any[]) : ((inscriptionPaymentsRaw as any)?.results ?? []);
    const targetInscriptionPayments = isMemberRole ? inscriptionPayments.filter((payment: any) => payment.membre === member?.id) : inscriptionPayments;
    targetInscriptionPayments.forEach((payment: any) => {
      items.push({ id: `notif-insc-${payment.id}`, type: "paiement-inscription", date: payment.date_paiement, amount: parseFloat(payment.montant), memberName: getMemberDisplayName(payment) });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loansRaw, repaymentsRaw, renflouementRaw, solidarityRaw, savingsRaw, assistancesRaw, assistancesByMemberRaw, inscriptionPaymentsRaw, isMemberRole, member]);

  const isLoading = loadingMember || loadingLoans || loadingRepayments || loadingSolidarity || loadingRenfl || loadingSavings || loadingAssistances || loadingAssistancesByMember || loadingInscriptionPayments;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Ionicons name="checkmark-done-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Loader ou Liste de notifications */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptySubtext}>Mise à jour des notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtext}>
            {isGlobalNotificationsView
              ? "Vous verrez ici les opérations enregistrées pour l’ensemble des membres."
              : "Vous recevrez ici les notifications importantes de la mutuelle"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const labelType = NOTIF_CONFIG[item.type as keyof typeof NOTIF_CONFIG] || "votre opération";
            const labelType1 = NOTIF_CONFIG_admin[item.type as keyof typeof NOTIF_CONFIG_admin] || "votre opération";
            return (
              <View style={styles.notifCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifText}>
                    {isGlobalNotificationsView ? (
                      <>
                        {item.amount> 0 ? (
                          <>
                            <Text style={styles.boldText}>{item.memberName}</Text> a une nouvelle opération <Text style={styles.boldText}>{labelType1}</Text> d’un montant de <Text style={styles.boldText}>{formatMoney(item.amount)}</Text>.
                          </>
                        ) : (
                          <>
                            <Text style={styles.boldText}>{item.memberName}</Text> a une nouvelle opération <Text style={styles.boldText}>de retrait</Text> d’un montant de <Text style={styles.boldText}>{formatMoney(item.amount)}</Text>.
                          </>
                        )}
                      </>
                    ) : (
                      <>
                      {item.amount > 0 ? (
                        <>
                          Vous avez effectué <Text style={styles.boldText}>{labelType}</Text> d’un montant de <Text style={styles.boldText}>{formatMoney(item.amount)}</Text>.
                        </>
                      ):(
                        <>
                        Vous avez effectué <Text style={styles.boldText}>{labelType}</Text> d’un montant de <Text style={styles.boldText}>{formatMoney(item.amount)}</Text>.
                        </>
                      )}
                      </>
                    )}
                  </Text>
                  <Text style={styles.notifDate}>{formatNotificationDate(item.date)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || "#FAFBFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  listContainer: {
    padding: SPACING.md,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS?.lg || 12,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    alignItems: "flex-start",
  },
  iconContainer: {
    backgroundColor: "rgba(37, 99, 235, 0.1)", // Teinte légère de bleu primaire
    padding: SPACING.sm,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text || "#333333",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "600",
    color: "#000000",
  },
  notifDate: {
    fontSize: FONT_SIZES.sm - 2,
    color: COLORS.textLight || "#666666",
    marginTop: 6,
    fontStyle: "italic",
    alignSelf: "flex-end", // Aligné en indice en bas à droite
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 22,
  },
});