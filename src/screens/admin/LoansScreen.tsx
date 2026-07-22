import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
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
import { useLoans, useCreateLoan } from "../../hooks/useLoan";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { Loan } from "../../types/loan.types";
import { Member } from "../../types/member.types";
import { useNavigation } from "@react-navigation/native";
import { useAdminDashboard } from "../../hooks/useDashboard";
import { useMutuelleConfig } from "../../hooks/useConfig";
import { useAuthContext } from "../../context/AuthContext";
import { useEmpruntTiers, calculateMaxEmpruntable } from "../../hooks/useEmpruntTiers";
import { min } from "lodash";

const { width } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const MODAL_ITEMS_PER_PAGE = 8;

// ─── Thème ────────────────────────────────────────────────────────────────────
const YELLOW = "#F59E0B";
const YELLOW2 = "#D97706";
const YELLOW_LIGHT = "#FFFBEB";

// ─── Utilitaires ──────────────────────────────────────────────────────────────
const formatCurrency = (amount: number | undefined | null): string => {
  if (!amount || isNaN(Number(amount))) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
  }).format(Number(amount));
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return dateStr.slice(0, 10); }
};

const getInitials = (name: string = "??"): string =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

const arr = (raw: any): any[] =>
  Array.isArray(raw) ? raw : raw?.results ?? [];

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoanWithStats {
  id: string;
  membre_numero: string;
  membre_nom: string;
  membre_email: string;
  montant_emprunte: number;
  montant_total_a_rembourser: number;
  montant_rembourse: number;
  montant_restant: number;
  pourcentage_rembourse: number;
  taux_interet: number;
  statut: string;
  statut_display: string;
  session_nom: string;
  date_emprunt: string;
  notes: string;
  is_overdue: boolean;
}

// ─── Carte emprunt ────────────────────────────────────────────────────────────
const LoanCard = ({ loan }: { loan: LoanWithStats }) => {
  const isEnCours   = loan.statut === "EN_COURS";
  const isRembourse = loan.statut === "REMBOURSE";
  const isRetard    = loan.statut === "EN_RETARD" || loan.is_overdue;

  const statusColor = isRembourse ? COLORS.success : isRetard ? COLORS.error : YELLOW;
  const statusLabel = loan.statut_display || loan.statut;
  const statusIcon  = isRembourse ? "checkmark-circle" : isRetard ? "alert-circle" : "time";

  const pct = Math.min(100, Math.max(0, loan.pourcentage_rembourse || 0));

  return (
    <View style={lc.card}>
      <View style={[lc.stripe, { backgroundColor: statusColor }]} />
      <View style={lc.body}>
        {/* En-tête */}
        <View style={lc.topRow}>
          <View style={lc.avatarWrap}>
            <LinearGradient colors={[YELLOW, YELLOW2]} style={lc.avatar}>
              <Text style={lc.avatarText}>{getInitials(loan.membre_nom)}</Text>
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={lc.name}>{loan.membre_nom}</Text>
            <Text style={lc.numero}>{loan.membre_numero}</Text>
          </View>
          <View style={[lc.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Ionicons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[lc.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Montants */}
        <View style={lc.amountsRow}>
          <View style={lc.amountItem}>
            <Text style={lc.amountLabel}>Reçu</Text>
            <Text style={[lc.amountValue, { color: YELLOW }]}>
              {formatCurrency(loan.montant_emprunte)}
            </Text>
          </View>
          <View style={lc.amountItem}>
            <Text style={lc.amountLabel}>Remboursé</Text>
            <Text style={[lc.amountValue, { color: COLORS.success }]}>
              {formatCurrency(loan.montant_rembourse)}
            </Text>
          </View>
          <View style={lc.amountItem}>
            <Text style={lc.amountLabel}>Restant</Text>
            <Text style={[lc.amountValue, { color: loan.montant_restant > 0 ? COLORS.error : COLORS.success }]}>
              {formatCurrency(loan.montant_restant)}
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
        {isEnCours || isRembourse ? (
          <View style={lc.progressWrap}>
            <View style={lc.progressBg}>
              <View style={[lc.progressFill, { width: `${pct}%` as any, backgroundColor: statusColor }]} />
            </View>
            <Text style={lc.progressLabel}>{pct.toFixed(0)}% remboursé</Text>
          </View>
        ) : null}

        {/* Pied */}
        <View style={lc.footer}>
          <View style={lc.footerItem}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={lc.footerText}>{formatDate(loan.date_emprunt)}</Text>
          </View>
          <View style={lc.footerItem}>
            <Ionicons name="business-outline" size={12} color={COLORS.textSecondary} />
            <Text style={lc.footerText}>{loan.session_nom || "—"}</Text>
          </View>
          <View style={lc.footerItem}>
            <Ionicons name="trending-up" size={12} color={COLORS.textSecondary} />
            <Text style={lc.footerText}>{loan.taux_interet}% intérêt</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const lc = StyleSheet.create({
  card:        { backgroundColor: "white", borderRadius: 16, overflow: "hidden", marginBottom: SPACING.md, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, flexDirection: "row" },
  stripe:      { width: 5 },
  body:        { flex: 1, padding: SPACING.md },
  topRow:      { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
  avatarWrap:  { marginRight: SPACING.sm },
  avatar:      { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText:  { color: "white", fontWeight: "800", fontSize: FONT_SIZES.md },
  name:        { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  numero:      { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: "700" },
  amountsRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sm, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  amountItem:  { alignItems: "center", flex: 1 },
  amountLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  amountValue: { fontSize: FONT_SIZES.sm, fontWeight: "800" },
  progressWrap:{ marginBottom: SPACING.sm },
  progressBg:  { height: 6, backgroundColor: "#F0F0F0", borderRadius: 3, marginBottom: 4 },
  progressFill:{ height: 6, borderRadius: 3 },
  progressLabel:{ fontSize: 10, color: COLORS.textSecondary, textAlign: "right" },
  footer:      { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
  footerItem:  { flexDirection: "row", alignItems: "center", gap: 3 },
  footerText:  { fontSize: 10, color: COLORS.textSecondary },
});

// ─── Tuile stat ───────────────────────────────────────────────────────────────
const StatCard = ({
  title, value, icon, color, subtitle,
}: { title: string; value: string; icon: string; color: string; subtitle?: string }) => (
  <View style={[sc.card, { borderLeftColor: color }]}>
    <View style={[sc.icon, { backgroundColor: color + "20" }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={sc.title}>{title}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      {subtitle && <Text style={sc.subtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const sc = StyleSheet.create({
  card:     { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, padding: SPACING.md, borderLeftWidth: 4, marginBottom: SPACING.sm, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, gap: SPACING.md },
  icon:     { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 2 },
  value:    { fontSize: FONT_SIZES.lg, fontWeight: "800" },
  subtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
});

// ─── Formulaire multi-step ────────────────────────────────────────────────────
interface MultiStepProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  currentSession: any;
  dashboardData: any;
  globalConfig: any;
  onSuccess: () => void;
}

const MultiStepModal = ({
  visible, onClose, members, currentSession, dashboardData, globalConfig, onSuccess,
}: MultiStepProps) => {
  const createLoan = useCreateLoan();
  const { data: tiersData } = useEmpruntTiers();
  const tiers = tiersData?.results ?? [];

  const [step, setStep]                     = useState<1 | 2 | 3>(1);
  const [memberSearch, setMemberSearch]     = useState("");
  const [memberPage, setMemberPage]         = useState(MODAL_ITEMS_PER_PAGE);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [amount, setAmount]                 = useState("");
  const [notes, setNotes]                   = useState("");

  const reset = () => {
    setStep(1); setMemberSearch(""); setMemberPage(MODAL_ITEMS_PER_PAGE);
    setSelectedMember(null); setAmount(""); setNotes("");
  };
  const handleClose = () => { reset(); onClose(); };

  // Taux d'intérêt
  const taux = currentSession?.taux_interet_emprunt || globalConfig?.taux_interet || 0;

  // Calculs
  const montant      = parseFloat(amount) || 0;
  const interet      = (montant * taux) / 100;
  const netADecaisser = montant - interet;

  const epargneActuelle = selectedMember?.donnees_financieres?.epargne?.epargne_totale || 0;
  const tresorTotal   = dashboardData?.tresor?.cumul_total_epargnes || 0;
  const aEmpruntEnCours = selectedMember?.donnees_financieres?.emprunt?.a_emprunt_en_cours ?? false;
  const empruntEnCours  = selectedMember?.donnees_financieres?.emprunt?.montant_emprunt_en_cours || 0;

  // Calculer le montant max empruntable basé sur l'épargne et les tiers
  const maxEmpruntableCalcule = calculateMaxEmpruntable(epargneActuelle, tiers);
  const maxAutorise = min([maxEmpruntableCalcule, tresorTotal]) || 0;

  const depasseMax = montant > maxAutorise && maxAutorise > 0;
  const tresorInsuffisant = montant > tresorTotal;

  // Step 1 — membres (seulement ceux ayant une épargne)
  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    // Filtrer d'abord par épargne > 0 et inscription complete
    let list = members.filter((m) => {
      const epargne = m.donnees_financieres?.epargne?.epargne_totale ?? 0;
      const inscriptionComplete = m.donnees_financieres?.inscription?.inscription_complete === true;
      return epargne > 0 && inscriptionComplete;
    });
    // Puis appliquer la recherche
    if (!q) return list;
    return list.filter((m) =>
      (m.utilisateur?.nom_complet ?? "").toLowerCase().includes(q) ||
      (m.numero_membre ?? "").toLowerCase().includes(q) ||
      (m.utilisateur?.email ?? "").toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const paginatedMembers = filteredMembers.slice(0, memberPage);
  const hasMoreMembers   = memberPage < filteredMembers.length;

  const handleSubmit = () => {
    if (!selectedMember || montant <= 0 || !currentSession?.id) return;

    createLoan.mutate(
      {
        membre: selectedMember.id,
        session: currentSession.id,
        montant_emprunte: parseFloat(montant.toFixed(2)),
        notes: notes.trim(),
      },
      {
        onSuccess: () => { reset(); onClose(); onSuccess(); Alert.alert("Succès", "Emprunt créé avec succès !"); },
        onError: (error: any) => {
          console.log(error.response.data.details)
          Alert.alert("Erreur", "Impossible de créer l'emprunt.");
        },
      }
    );
  };

  const stepLabels: Record<1 | 2 | 3, string> = { 1: "Choisir un membre", 2: "Montant", 3: "Confirmer" };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={ms.overlay}>
          <View style={ms.sheet}>

            {/* Header */}
            <LinearGradient colors={[YELLOW, YELLOW2]} style={ms.header}>
              {/* Step bar */}
              <View style={ms.stepBar}>
                {([1, 2, 3] as const).map((s) => (
                  <View key={s} style={ms.stepBarItem}>
                    <View style={[ms.stepDot, step >= s && ms.stepDotActive]}>
                      {step > s
                        ? <Ionicons name="checkmark" size={12} color={YELLOW} />
                        : <Text style={[ms.stepNum, step === s && { color: YELLOW }]}>{s}</Text>}
                    </View>
                    {s < 3 && <View style={[ms.stepLine, step > s && ms.stepLineActive]} />}
                  </View>
                ))}
              </View>
              <View style={ms.headerRow}>
                <TouchableOpacity onPress={handleClose} style={ms.closeBtn}>
                  <Ionicons name="close" size={22} color="white" />
                </TouchableOpacity>
                <Text style={ms.headerTitle}>{stepLabels[step]}</Text>
                <View style={{ width: 36 }} />
              </View>
            </LinearGradient>

            {/* ── Step 1 : choisir membre ── */}
            {step === 1 && (
              <>
                <View style={ms.searchBox}>
                  <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                  <TextInput
                    style={ms.searchInput}
                    value={memberSearch}
                    onChangeText={(v) => { setMemberSearch(v); setMemberPage(MODAL_ITEMS_PER_PAGE); }}
                    placeholder="Rechercher par nom, numéro, email…"
                    placeholderTextColor={COLORS.textLight}
                    autoFocus
                  />
                  {memberSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setMemberSearch("")}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={ms.resultCount}>
                  {filteredMembers.length} membre{filteredMembers.length !== 1 ? "s" : ""}
                </Text>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.listPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {filteredMembers.length === 0 ? (
                    <View style={ms.empty}>
                      <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                      <Text style={ms.emptyText}>Aucun membre trouvé</Text>
                    </View>
                  ) : (
                    paginatedMembers.map((m) => {
                      const epargne = m.donnees_financieres?.epargne?.epargne_totale ?? 0;
                      const hasLoan = m.donnees_financieres?.emprunt?.a_emprunt_en_cours ?? false;
                      const initials = getInitials(m.utilisateur?.nom_complet ?? "");
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={ms.memberCard}
                          onPress={() => { setSelectedMember(m); setStep(2); }}
                          activeOpacity={0.8}
                        >
                          <LinearGradient colors={[YELLOW, YELLOW2]} style={ms.memberAvatar}>
                            <Text style={ms.memberInitials}>{initials}</Text>
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <Text style={ms.memberName}>{m.utilisateur?.nom_complet}</Text>
                            <Text style={ms.memberNumero}>{m.numero_membre}</Text>
                            <Text style={ms.memberEmail} numberOfLines={1}>{m.utilisateur?.email}</Text>
                            <View style={ms.memberRow}>
                              <Text style={ms.memberEpargne}>Épargne : {formatCurrency(epargne)}</Text>
                              {hasLoan && (
                                <View style={ms.loanBadge}>
                                  <Text style={ms.loanBadgeText}>Prêt en cours</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                        </TouchableOpacity>
                      );
                    })
                  )}
                  {hasMoreMembers && (
                    <TouchableOpacity
                      style={ms.loadMore}
                      onPress={() => setMemberPage((p) => p + MODAL_ITEMS_PER_PAGE)}
                    >
                      <Text style={ms.loadMoreText}>
                        Voir plus ({filteredMembers.length - memberPage} restant{filteredMembers.length - memberPage > 1 ? "s" : ""})
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={YELLOW} />
                    </TouchableOpacity>
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            )}

            {/* ── Step 2 : montant ── */}
            {step === 2 && selectedMember && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.stepPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Mini-carte membre */}
                <LinearGradient colors={[YELLOW + "18", YELLOW2 + "0A"]} style={ms.memberBanner}>
                  <LinearGradient colors={[YELLOW, YELLOW2]} style={ms.bannerAvatar}>
                    <Text style={ms.bannerInitials}>{getInitials(selectedMember.utilisateur?.nom_complet ?? "")}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.bannerName}>{selectedMember.utilisateur?.nom_complet}</Text>
                    <Text style={ms.bannerNumero}>{selectedMember.numero_membre}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setStep(1); setAmount(""); }} style={ms.changeBtn}>
                    <Text style={ms.changeBtnText}>Changer</Text>
                  </TouchableOpacity>
                </LinearGradient>

                {/* Grille infos financières */}
                <View style={ms.infoGrid}>
                  <InfoTile label="Épargne actuelle"     value={formatCurrency(epargneActuelle)}   color={COLORS.success} icon="wallet" />
                  <InfoTile label="Max empruntable (calculé)" value={formatCurrency(maxEmpruntableCalcule)} color={YELLOW}         icon="card" />
                  <InfoTile label="Trésor disponible"    value={formatCurrency(tresorTotal)}        color={COLORS.primary} icon="cash" />
                  <InfoTile label="Montant final autorisé" value={formatCurrency(maxAutorise)} color={maxAutorise > 0 ? COLORS.success : COLORS.error} icon="checkmark-circle" />
                  <InfoTile label="Taux d'intérêt"       value={`${taux}%`}                        color={COLORS.warning} icon="trending-up" />
                  {aEmpruntEnCours && (
                    <InfoTile label="Emprunt en cours"   value={formatCurrency(empruntEnCours)}    color={COLORS.error}   icon="alert-circle" />
                  )}
                </View>

                {/* Saisie montant */}
                <Text style={ms.label}>Montant de l'emprunt <Text style={{ color: COLORS.error }}>*</Text></Text>
                <View style={[ms.amountBox, depasseMax && { borderColor: COLORS.error + "80" }]}>
                  <TextInput
                    style={ms.amountInput}
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textLight}
                    autoFocus
                  />
                  <Text style={ms.amountUnit}>FCFA</Text>
                </View>

                {/* Avertissement dépassement */}
                {montant > 0 && (
                  <>
                    {depasseMax && (
                      <View style={ms.warnBox}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={ms.warnText}>
                          Dépasse le maximum autorisé ({formatCurrency(maxAutorise)})
                        </Text>
                      </View>
                    )}
                    {montant <= maxEmpruntableCalcule && tresorInsuffisant && (
                      <View style={ms.warnBox}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={ms.warnText}>
                          Trésor insuffisant ({formatCurrency(tresorTotal)} disponible)
                        </Text>
                      </View>
                    )}
                    {montant <= maxAutorise && montant > 0 && (
                      <View style={[ms.warnBox, { backgroundColor: COLORS.success + "15" }]}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={[ms.warnText, { color: COLORS.success }]}>
                          Montant autorisé
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Aperçu calcul */}
                {montant > 0 && (
                  <LinearGradient colors={[YELLOW + "18", YELLOW2 + "0A"]} style={ms.preview}>
                    <View style={ms.previewRow}>
                      <Text style={ms.previewLabel}>Montant brut</Text>
                      <Text style={ms.previewValue}>{formatCurrency(montant)}</Text>
                    </View>
                    <View style={ms.previewRow}>
                      <Text style={ms.previewLabel}>Intérêts ({taux}%)</Text>
                      <Text style={[ms.previewValue, { color: COLORS.error }]}>− {formatCurrency(interet)}</Text>
                    </View>
                    <View style={[ms.previewRow, { borderTopWidth: 1, borderTopColor: YELLOW + "30", marginTop: 6, paddingTop: 6 }]}>
                      <Text style={[ms.previewLabel, { fontWeight: "700", color: COLORS.text }]}>Net à décaisser</Text>
                      <Text style={[ms.previewValue, { color: YELLOW, fontSize: FONT_SIZES.lg }]}>{formatCurrency(netADecaisser)}</Text>
                    </View>
                  </LinearGradient>
                )}

                <Text style={[ms.label, { marginTop: SPACING.md }]}>Notes (optionnel)</Text>
                <TextInput
                  style={ms.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Remarques sur cet emprunt…"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />

                <View style={ms.navRow}>
                  <TouchableOpacity style={ms.backBtn} onPress={() => setStep(1)}>
                    <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                    <Text style={ms.backBtnText}>Retour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.nextBtn, (montant <= 0 || depasseMax || tresorInsuffisant) && { opacity: 0.4 }]}
                    onPress={() => setStep(3)}
                    disabled={montant <= 0 || depasseMax || tresorInsuffisant}
                  >
                    <LinearGradient colors={[YELLOW, YELLOW2]} style={ms.nextBtnGrad}>
                      <Text style={ms.nextBtnText}>Continuer</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {/* ── Step 3 : résumé ── */}
            {step === 3 && selectedMember && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.stepPad} showsVerticalScrollIndicator={false}>
                <Text style={ms.resumeTitle}>Récapitulatif</Text>

                <View style={ms.resumeCard}>
                  <ResumeRow icon="person"           label="Membre"         value={selectedMember.utilisateur?.nom_complet ?? "—"} />
                  <ResumeRow              label="Numéro"         value={selectedMember.numero_membre} />
                  <ResumeRow          label="Session"        value={currentSession?.nom ?? "—"} />
                  {/* <View style={ms.divider} /> */}
                  <ResumeRow icon="cash"             label="Montant brut"   value={formatCurrency(montant)} />
                  <ResumeRow icon="trending-up"      label={`Intérêts (${taux}%)`} value={`− ${formatCurrency(interet)}`} valueColor={COLORS.error} />
                  <ResumeRow icon="arrow-down-circle" label="Net décaissé"  value={formatCurrency(netADecaisser)} valueColor={YELLOW} bold />
                  {notes.trim() && <ResumeRow icon="chatbubble-outline" label="Notes" value={notes.trim()} />}
                </View>

                {depasseMax && (
                  <View style={[ms.warnBox, { marginBottom: SPACING.md }]}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={ms.warnText}>⚠️ Dépasse le maximum autorisé pour ce membre</Text>
                  </View>
                )}

                <View style={ms.navRow}>
                  <TouchableOpacity style={ms.backBtn} onPress={() => setStep(2)}>
                    <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                    <Text style={ms.backBtnText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.nextBtn, createLoan.isPending && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={createLoan.isPending}
                  >
                    <LinearGradient colors={[COLORS.success, "#059669"]} style={ms.nextBtnGrad}>
                      {createLoan.isPending
                        ? <ActivityIndicator size="small" color="white" />
                        : <>
                            <Ionicons name="checkmark-circle" size={18} color="white" />
                            <Text style={ms.nextBtnText}>Valider l'emprunt</Text>
                          </>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Sous-composants du modal
const InfoTile = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) => (
  <View style={it.tile}>
    <View style={[it.icon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </View>
    <Text style={it.label}>{label}</Text>
    <Text style={[it.value, { color }]}>{value}</Text>
  </View>
);

const it = StyleSheet.create({
  tile:  { width: "48%", backgroundColor: "white", borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: "#FDE68A", alignItems: "center" },
  icon:  { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  label: { fontSize: 10, color: COLORS.textSecondary, textAlign: "center", marginBottom: 2 },
  value: { fontSize: FONT_SIZES.sm, fontWeight: "800", textAlign: "center" },
});

const ResumeRow = ({ icon, label, value, valueColor, bold }: { icon?: string; label: string; value: string; valueColor?: string; bold?: boolean }) => (
  <View style={rr.row}>
    <Ionicons name={icon as any} size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
    <Text style={rr.label}>{label}</Text>
    <Text style={[rr.value, valueColor ? { color: valueColor } : {}, bold ? { fontWeight: "800" } : {}]}>
      {value}
    </Text>
  </View>
);

const rr = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  label: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  value: { fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: "600", textAlign: "right", maxWidth: "55%" },
});

const ms = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: "flex-end" },
  sheet:          { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "90%", overflow: "hidden" },
  header:         { paddingTop: SPACING.md, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  stepBar:        { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  stepBarItem:    { flexDirection: "row", alignItems: "center" },
  stepDot:        { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  stepDotActive:  { backgroundColor: "white" },
  stepNum:        { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  stepLine:       { width: 32, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 4 },
  stepLineActive: { backgroundColor: "white" },
  headerRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: FONT_SIZES.lg, fontWeight: "800", color: "white", flex: 1, textAlign: "center" },
  searchBox:      { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: SPACING.lg, marginBottom: SPACING.sm, borderRadius: 14, paddingHorizontal: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput:    { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, paddingVertical: 12 },
  resultCount:    { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  listPad:        { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  stepPad:        { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  empty:          { alignItems: "center", paddingVertical: 60 },
  emptyText:      { fontSize: FONT_SIZES.md, color: COLORS.textLight, marginTop: SPACING.md },
  memberCard:     { backgroundColor: "white", borderRadius: 14, padding: SPACING.md, flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm, borderWidth: 1, borderColor: "#FDE68A", elevation: 1 },
  memberAvatar:   { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: "white", fontWeight: "800", fontSize: FONT_SIZES.md },
  memberName:     { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  memberNumero:   { fontSize: FONT_SIZES.sm, color: YELLOW, fontWeight: "600" },
  memberEmail:    { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  memberRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  memberEpargne:  { fontSize: 11, color: COLORS.success, fontWeight: "600" },
  loanBadge:      { backgroundColor: COLORS.error + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  loanBadgeText:  { fontSize: 10, color: COLORS.error, fontWeight: "700" },
  loadMore:       { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: 6 },
  loadMoreText:   { fontSize: FONT_SIZES.sm, color: YELLOW, fontWeight: "600" },
  memberBanner:   { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: SPACING.md, marginTop: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  bannerAvatar:   { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  bannerInitials: { color: "white", fontWeight: "800", fontSize: FONT_SIZES.md },
  bannerName:     { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  bannerNumero:   { fontSize: FONT_SIZES.sm, color: YELLOW },
  changeBtn:      { backgroundColor: "white", paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: YELLOW + "40" },
  changeBtnText:  { fontSize: 12, color: YELLOW, fontWeight: "600" },
  infoGrid:       { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: SPACING.md },
  label:          { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm },
  amountBox:      { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 16, borderWidth: 2, borderColor: YELLOW + "40", paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  amountInput:    { flex: 1, fontSize: 28, fontWeight: "800", color: COLORS.text, paddingVertical: SPACING.md },
  amountUnit:     { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: "600" },
  warnBox:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.error + "10", borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.sm },
  warnText:       { fontSize: FONT_SIZES.sm, color: COLORS.error, flex: 1 },
  preview:        { borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md },
  previewRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  previewLabel:   { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  previewValue:   { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  notesInput:     { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.text, height: 80, textAlignVertical: "top" },
  navRow:         { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },
  backBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  backBtnText:    { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.textSecondary },
  nextBtn:        { flex: 2, borderRadius: 14, overflow: "hidden" },
  nextBtnGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, paddingVertical: SPACING.md },
  nextBtnText:    { fontSize: FONT_SIZES.md, fontWeight: "700", color: "white" },
  resumeTitle:    { fontSize: FONT_SIZES.lg, fontWeight: "800", color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.md },
  resumeCard:     { backgroundColor: "white", borderRadius: 18, padding: SPACING.lg, borderWidth: 1, borderColor: "#FDE68A", marginBottom: SPACING.lg },
  divider:        { height: 1, backgroundColor: "#F0F0F0", marginVertical: SPACING.sm },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function LoansScreen() {
  const { user }    = useAuthContext();
  const readOnly    = !user?.can_write;
  const navigation  = useNavigation();

  const [showModal, setShowModal]       = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "EN_COURS" | "REMBOURSE" | "EN_RETARD">("all");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const [statsOpen, setStatsOpen]       = useState(false); // toggle stats

  // Données
  const { data: loansData,   isLoading: loadingLoans,   refetch: refetchLoans }  = useLoans();
  const { data: membersData, isLoading: loadingMembers }                          = useMembers();
  const { data: currentSession }                                                  = useCurrentSession();
  const { data: dashboardData }                                                   = useAdminDashboard();
  const { data: globalConfig }                                                    = useMutuelleConfig();

  const loans: Loan[] = useMemo(() => arr(loansData), [loansData]);
  const members: Member[] = useMemo(() => arr(membersData), [membersData]);

  // Transformation en LoanWithStats
  const loansWithStats: LoanWithStats[] = useMemo(() => {
    return loans.map((loan) => {
      const daysAgo   = Math.floor((Date.now() - new Date(loan.date_emprunt).getTime()) / 86_400_000);
      const isOverdue = loan.statut === "EN_COURS" && daysAgo > 90;
      return {
        id: loan.id,
        membre_numero: loan.membre_info?.numero_membre || "N/A",
        membre_nom:    loan.membre_info?.nom_complet   || "—",
        membre_email:  loan.membre_info?.email         || "",
        montant_emprunte:           loan.montant_emprunte,
        montant_total_a_rembourser: loan.montant_total_a_rembourser,
        montant_rembourse:          loan.montant_rembourse,
        montant_restant:            loan.montant_restant_a_rembourser,
        pourcentage_rembourse:      loan.pourcentage_rembourse || 0,
        taux_interet:               loan.taux_interet,
        statut:         loan.statut,
        statut_display: loan.statut_display,
        session_nom:    loan.session_nom,
        date_emprunt:   loan.date_emprunt,
        notes:          loan.notes || "",
        is_overdue:     isOverdue,
      };
    }).sort((a, b) => new Date(b.date_emprunt).getTime() - new Date(a.date_emprunt).getTime());
  }, [loans]);

  // Statistiques
  const stats = useMemo(() => ({
    total:          loansWithStats.length,
    enCours:        loansWithStats.filter((l) => l.statut === "EN_COURS" && !l.is_overdue).length,
    rembourses:     loansWithStats.filter((l) => l.statut === "REMBOURSE").length,
    enRetard:       loansWithStats.filter((l) => l.statut === "EN_RETARD" || l.is_overdue).length,
    totalPrete:     loansWithStats.reduce((s, l) => s + l.montant_emprunte, 0),
    totalRembourse: loansWithStats.reduce((s, l) => s + l.montant_rembourse, 0),
    totalRestant:   loansWithStats.reduce((s, l) => s + l.montant_restant, 0),
    tauxMoyen:      loansWithStats.length > 0
      ? loansWithStats.reduce((s, l) => s + l.pourcentage_rembourse, 0) / loansWithStats.length
      : 0,
  }), [loansWithStats]);

  // Filtrage + recherche
  const filteredLoans = useMemo(() => {
    let list = loansWithStats;
    if (statusFilter === "EN_COURS")   list = list.filter((l) => l.statut === "EN_COURS" && !l.is_overdue);
    if (statusFilter === "REMBOURSE")  list = list.filter((l) => l.statut === "REMBOURSE");
    if (statusFilter === "EN_RETARD")  list = list.filter((l) => l.statut === "EN_RETARD" || l.is_overdue);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.membre_nom.toLowerCase().includes(q) ||
        l.membre_numero.toLowerCase().includes(q) ||
        (l.session_nom || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [loansWithStats, statusFilter, search]);

  const paginatedLoans = useMemo(() => filteredLoans.slice(0, displayedItems), [filteredLoans, displayedItems]);
  const hasMore        = displayedItems < filteredLoans.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetchLoans(); } catch {}
    setRefreshing(false);
  };

  const isLoading = loadingLoans || loadingMembers;

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header gradient ── */}
      <LinearGradient colors={[YELLOW, YELLOW2]} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Ionicons name="card" size={32} color="white" style={{ marginBottom: SPACING.sm }} />
          <Text style={s.headerTitle}>Gestion des Emprunts</Text>
          <Text style={s.headerSubtitle}>Session : {currentSession?.nom ?? "—"}</Text>
        </View>

        {/* Résumé rapide dans le header */}
        {/* <View style={s.headerPills}>
          <View style={s.pill}>
            <Text style={s.pillVal}>{stats.enCours}</Text>
            <Text style={s.pillLab}>En cours</Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillVal}>{stats.rembourses}</Text>
            <Text style={s.pillLab}>Remboursés</Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillVal, stats.enRetard > 0 && { color: "#FF6B6B" }]}>{stats.enRetard}</Text>
            <Text style={s.pillLab}>En retard</Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillVal}>{stats.tauxMoyen.toFixed(0)}%</Text>
            <Text style={s.pillLab}>Taux remb.</Text>
          </View>
        </View> */}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={YELLOW} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats déroulantes ── */}
        <View style={s.statsSection}>
          <TouchableOpacity style={s.statsToggle} onPress={() => setStatsOpen((o) => !o)} activeOpacity={0.8}>
            <View style={s.statsToggleLeft}>
              <Ionicons name="stats-chart" size={18} color={YELLOW} />
              <Text style={s.statsToggleLabel}>Statistiques détaillées</Text>
            </View>
            <Ionicons name={statsOpen ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {statsOpen && (
            <View style={s.statsBody}>
              <StatCard title="Total prêté"        value={formatCurrency(stats.totalPrete)}     icon="cash"            color={YELLOW}         subtitle={`${stats.total} emprunt${stats.total > 1 ? "s" : ""}`} />
              <StatCard title="Total remboursé"    value={formatCurrency(stats.totalRembourse)} icon="arrow-down-circle" color={COLORS.success} subtitle={`${stats.tauxMoyen.toFixed(1)}% taux moyen`} />
              <StatCard title="Restant à recouvrer" value={formatCurrency(stats.totalRestant)}  icon="time"            color={COLORS.warning}  subtitle={`${stats.enCours} actif${stats.enCours > 1 ? "s" : ""}`} />
              <StatCard title="En retard"          value={String(stats.enRetard)}               icon="alert-circle"    color={stats.enRetard > 0 ? COLORS.error : COLORS.success} subtitle={stats.enRetard > 0 ? "Attention requise" : "Aucun retard"} />
              <StatCard title="Trésor disponible"  value={formatCurrency(dashboardData?.tresor?.cumul_total_epargnes || 0)} icon="wallet" color={COLORS.primary} subtitle="Liquidités épargne" />
              <StatCard title="Taux d'intérêt"     value={`${currentSession?.taux_interet_emprunt || globalConfig?.taux_interet || 0}%`} icon="trending-up" color={COLORS.warning} subtitle="Taux appliqué" />
            </View>
          )}
        </View>

        {/* ── Barre recherche + bouton ── */}
        <View style={s.toolbar}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={(v) => { setSearch(v); setDisplayedItems(ITEMS_PER_PAGE); }}
              placeholder="Rechercher un membre…"
              placeholderTextColor={COLORS.textLight}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {!readOnly && (
            <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
              <LinearGradient colors={[YELLOW, YELLOW2]} style={s.addBtnGrad}>
                <Ionicons name="add" size={18} color="white" />
                <Text style={s.addBtnText}>Ajouter emprunt</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filtres statut ── */}
        <View style={s.filters}>
          {(["all", "EN_COURS", "REMBOURSE", "EN_RETARD"] as const).map((key) => {
            const labels: Record<string, string> = { all: "Tous", EN_COURS: "En cours", REMBOURSE: "Remboursés", EN_RETARD: "En retard" };
            const active = statusFilter === key;
            const dotColor = key === "EN_COURS" ? YELLOW : key === "REMBOURSE" ? COLORS.success : key === "EN_RETARD" ? COLORS.error : COLORS.textSecondary;
            return (
              <TouchableOpacity
                key={key}
                style={[s.filterChip, active && { backgroundColor: dotColor, borderColor: dotColor }]}
                onPress={() => { setStatusFilter(key); setDisplayedItems(ITEMS_PER_PAGE); }}
              >
                <Text style={[s.filterChipText, active && { color: "white" }]}>{labels[key]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Liste ── */}
        <View style={s.listSection}>
          {isLoading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={YELLOW} />
              <Text style={s.loadingText}>Chargement…</Text>
            </View>
          ) : filteredLoans.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="card-outline" size={48} color={COLORS.textLight} />
              </View>
              <Text style={s.emptyTitle}>Aucun emprunt</Text>
              <Text style={s.emptyText}>
                {search ? "Aucun résultat pour cette recherche" : "Aucun emprunt enregistré"}
              </Text>
              {!readOnly && !search && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
                  <Text style={s.emptyBtnText}>Enregistrer un emprunt</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {/* Compteur */}
              <View style={s.counter}>
                <Ionicons name="list" size={16} color={YELLOW} />
                <Text style={s.counterText}>
                  <Text style={s.counterBold}>{paginatedLoans.length}</Text>
                  {" "}sur{" "}
                  <Text style={s.counterBold}>{filteredLoans.length}</Text>
                  {" "}emprunt{filteredLoans.length > 1 ? "s" : ""}
                </Text>
              </View>

              {paginatedLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}

              {hasMore && (
                <TouchableOpacity
                  style={s.loadMore}
                  onPress={() => setDisplayedItems((p) => p + ITEMS_PER_PAGE)}
                >
                  <LinearGradient colors={[YELLOW, YELLOW2]} style={s.loadMoreGrad}>
                    <Text style={s.loadMoreText}>
                      Voir plus ({filteredLoans.length - displayedItems} restant{filteredLoans.length - displayedItems > 1 ? "s" : ""})
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Modal multi-step ── */}
      <MultiStepModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        members={members}
        currentSession={currentSession}
        dashboardData={dashboardData}
        globalConfig={globalConfig}
        onSuccess={() => refetchLoans()}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#FFFBEB" },

  header:         { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.sm },
  backButton:     { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  headerContent:  { alignItems: "center", marginBottom: SPACING.lg },
  headerTitle:    { fontSize: FONT_SIZES.xxl, fontWeight: "800", color: "white", marginBottom: 4 },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: "rgba(255,255,255,0.85)" },
  headerPills:    { flexDirection: "row", gap: SPACING.sm },
  pill:           { flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingVertical: SPACING.sm },
  pillVal:        { fontSize: FONT_SIZES.lg, fontWeight: "800", color: "white" },
  pillLab:        { fontSize: 10, color: "rgba(255,255,255,0.8)" },

  statsSection:   { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  statsToggle:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  statsToggleLeft:{ flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  statsToggleLabel:{ fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  statsBody:      { gap: 0 },

  toolbar:        { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, gap: SPACING.md },
  searchBox:      { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, paddingHorizontal: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: "#FDE68A" },
  searchInput:    { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, paddingVertical: 10 },
  addBtn:         { borderRadius: 12, overflow: "hidden" },
  addBtnGrad:     { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 6 },
  addBtnText:     { color: "white", fontSize: FONT_SIZES.sm, fontWeight: "700" },

  filters:        { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, gap: SPACING.sm, flexWrap: "wrap" },
  filterChip:     { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#FDE68A" },
  filterChipText: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },

  listSection:    { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },

  counter:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: YELLOW + "12", borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: 8, marginBottom: SPACING.md },
  counterText:    { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  counterBold:    { fontWeight: "700", color: YELLOW },

  center:         { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  loadingText:    { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.md },

  empty:          { alignItems: "center", paddingVertical: 60 },
  emptyIcon:      { width: 90, height: 90, borderRadius: 45, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  emptyTitle:     { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  emptyText:      { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
  emptyBtn:       { backgroundColor: YELLOW, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: 14 },
  emptyBtnText:   { color: "white", fontWeight: "700", fontSize: FONT_SIZES.md },

  loadMore:       { marginTop: SPACING.md, marginBottom: SPACING.md, borderRadius: 14, overflow: "hidden" },
  loadMoreGrad:   { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: SPACING.sm },
  loadMoreText:   { fontSize: FONT_SIZES.md, fontWeight: "600", color: "white" },
});