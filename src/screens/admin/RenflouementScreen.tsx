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
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  useRenflouements,
  useRenflouementStats,
  useCreateRenflouementPayment,
  useRenflouementsByMembre,
  usePayRenflouementWithSavings,
  useRenflouementPayments,
} from "../../hooks/useRenflouement";
import { useMembers } from "../../hooks/useMember";
import { Renflouement, RenflouementPayment } from "../../types/renflouement.types";
import { Member } from "../../types/member.types";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getInitials, normalizeArray } from "../../utils/helpers";

const { width } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const MODAL_ITEMS_PER_PAGE = 8;

// ─── Thème ────────────────────────────────────────────────────────────────────
const TEAL  = "#14B8A6";
const TEAL2 = "#0D9488";

// ─── StatCard ────────────────────────────────────────────────────────────────
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

// ─── Carte paiement renflouement (liste principale) ───────────────────────────
const RenflouementPaymentCard = ({ item }: { item: RenflouementPayment }) => {
  const montantNum = parseFloat(item.montant);
  const progress = Math.min(
    100,
    (item.renflouement_info.montant_paye / item.renflouement_info.montant_du) * 100
  );
  const isSolde = item.renflouement_info.montant_restant <= 0;
  const color = isSolde ? COLORS.success : TEAL;

  return (
    <View style={rfc.card}>
      <View style={[rfc.stripe, { backgroundColor: color }]} />
      <View style={rfc.body}>
        {/* Top row: Member info + Session */}
        <View style={rfc.topRow}>
          <LinearGradient colors={[TEAL, TEAL2]} style={rfc.avatar}>
            <Text style={rfc.avatarText}>{getInitials(item.membre_nom ?? "")}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={rfc.name}>{item.membre_nom}</Text>
            <Text style={rfc.numero}>{item.membre_numero}</Text>
            <Text style={[rfc.numero, { fontSize: FONT_SIZES.xs, marginTop: 2 }]}>
              {item.session_info?.exercice_nom} - {item.session_info?.nom}
            </Text>
          </View>
          <View style={[rfc.badge, { backgroundColor: color + "20" }]}>
            <Text style={[rfc.badgeText, { color }]}>
              {isSolde ? "Soldé" : "Partiel"}
            </Text>
          </View>
        </View>

        {/* Montants: Dû, Payé ce jour, Restant */}
        <View style={rfc.amountsRow}>
          <View style={rfc.amountItem}>
            <Text style={rfc.amountLabel}>Dû</Text>
            <Text style={[rfc.amountValue, { color: TEAL }]}>
              {formatCurrency(item.renflouement_info.montant_du)}
            </Text>
          </View>
          <View style={rfc.amountItem}>
            <Text style={rfc.amountLabel}>Ce paiement</Text>
            <Text style={[rfc.amountValue, { color: COLORS.success }]}>{formatCurrency(montantNum)}</Text>
          </View>
          <View style={rfc.amountItem}>
            <Text style={rfc.amountLabel}>Restant</Text>
            <Text style={[rfc.amountValue, { color: item.renflouement_info.montant_restant > 0 ? COLORS.error : COLORS.success }]}>
              {item.renflouement_info.montant_restant > 0 ? formatCurrency(item.renflouement_info.montant_restant) : "0,00"}
            </Text>
          </View>
        </View>

        {/* Barre progression */}
        <View style={rfc.progressWrap}>
          <View style={rfc.progressBg}>
            <View style={[rfc.progressFill, { width: `${progress}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={rfc.progressLabel}>{progress.toFixed(0)}% payé</Text>
        </View>

        {/* Répartition */}
        <View style={rfc.repartitionBox}>
          <View style={rfc.repartitionItem}>
            <View style={[rfc.repartitionDot, { backgroundColor: COLORS.primary }]} />
            <View>
              <Text style={rfc.repartitionLabel}>Caisse</Text>
              <Text style={rfc.repartitionValue}>{item.repartition_detail.caisse_inscription}</Text>
            </View>
          </View>
          <View style={rfc.repartitionItem}>
            <View style={[rfc.repartitionDot, { backgroundColor: COLORS.warning }]} />
            <View>
              <Text style={rfc.repartitionLabel}>Fonds social</Text>
              <Text style={rfc.repartitionValue}>{item.repartition_detail.fonds_social}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={rfc.footer}>
          <View style={rfc.footerItem}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={rfc.footerText}>{formatDate(item.date_paiement)}</Text>
          </View>
          {item.notes ? (
            <View style={rfc.footerItem}>
              <Ionicons name="document-text-outline" size={12} color={COLORS.textSecondary} />
              <Text style={[rfc.footerText, { maxWidth: 150 }]} numberOfLines={1}>{item.notes}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const rfc = StyleSheet.create({
  card:         { backgroundColor: "white", borderRadius: 16, overflow: "hidden", marginBottom: SPACING.md, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, flexDirection: "row" },
  stripe:       { width: 5 },
  body:         { flex: 1, padding: SPACING.md },
  topRow:       { flexDirection: "row", alignItems: "flex-start", marginBottom: SPACING.sm },
  avatar:       { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm, marginTop: 3 },
  avatarText:   { color: "white", fontWeight: "800", fontSize: FONT_SIZES.md },
  name:         { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  numero:       { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: "700" },
  amountsRow:   { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F5F5F5", paddingTop: SPACING.sm, marginBottom: SPACING.sm },
  amountItem:   { alignItems: "center", flex: 1 },
  amountLabel:  { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  amountValue:  { fontSize: FONT_SIZES.sm, fontWeight: "800" },
  progressWrap: { marginBottom: SPACING.sm },
  progressBg:   { height: 6, backgroundColor: "#F0F0F0", borderRadius: 3, marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel:{ fontSize: 10, color: COLORS.textSecondary, textAlign: "right" },
  repartitionBox:   { backgroundColor: "#F9FAFB", borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.sm, flexDirection: "row", gap: SPACING.md },
  repartitionItem:  { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 6 },
  repartitionDot:   { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  repartitionLabel: { fontSize: 10, color: COLORS.textSecondary },
  repartitionValue: { fontSize: 11, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  footer:       { flexDirection: "row", gap: SPACING.md, flexWrap: "wrap" },
  footerItem:   { flexDirection: "row", alignItems: "center", gap: 3 },
  footerText:   { fontSize: 10, color: COLORS.textSecondary },
});

// ─── Formulaire multi-step ────────────────────────────────────────────────────
interface MultiStepProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEP_LABELS: Record<1 | 2 | 3 | 4 , string> = {
  1: "Choisir un membre",
  2: "Sélectionner un renflouement",
  3: "Saisir le montant",
  4: "Confirmer",
};

const MultiStepModal = ({ visible, onClose, onSuccess }: MultiStepProps) => {
  const createPayment = useCreateRenflouementPayment();

  const [step, setStep]                           = useState<1 | 2 | 3 | 4 >(1);
  const [memberFilter, setMemberFilter]           = useState<"EN_REGLE" | "all">("EN_REGLE");
  const [memberSearch, setMemberSearch]           = useState("");
  const [memberPage, setMemberPage]               = useState(MODAL_ITEMS_PER_PAGE);
  const [selectedMember, setSelectedMember]       = useState<Member | null>(null);
  const [selectedRenflouement, setSelectedRenflouement] = useState<Renflouement | null>(null);
  const [amount, setAmount]                       = useState("");
  const [notes, setNotes]                         = useState("");
  const payWithSavings = usePayRenflouementWithSavings();
  
  // Membres
  const { data: membersRaw, isLoading: loadingMembers } = useMembers(
    memberFilter === "EN_REGLE" ? { statut: "EN_REGLE" } : {}
  );
  const members: Member[] = useMemo(() => normalizeArray(membersRaw), [membersRaw]);

  // Renflouements du membre sélectionné
  const {
    data: membreRenflouements = [],
    isLoading: loadingRenflouements,
    isError: errorRenflouements,
  } = useRenflouementsByMembre(selectedMember?.id ?? null);

  // Renflouements non soldés uniquement (pour le step 3)
  const nonSoldes = useMemo(
    () => membreRenflouements.filter((r) => !r.is_solde),
    [membreRenflouements]
  );

  const montantSaisi   = parseFloat(amount) || 0;
  const montantRestant = selectedRenflouement?.montant_restant ?? 0;
  const montantInvalide = montantSaisi <= 0 || (montantSaisi > montantRestant + 100) || !Number.isInteger(montantSaisi);
  const reset = () => {
    setStep(1);
    setMemberSearch("");
    setMemberPage(MODAL_ITEMS_PER_PAGE);
    setSelectedMember(null);
    setSelectedRenflouement(null);
    setAmount("");
    setNotes("");
    setMemberFilter("EN_REGLE");
  };

  const handleSavingsPayment = () => {
    if (!selectedRenflouement || montantSaisi <= 0) return;
    let finalMontant = montantSaisi;
    if (finalMontant > montantRestant && finalMontant <= montantRestant + 100) {
      finalMontant = montantRestant;
    }

    // Confirmation Alert
    Alert.alert(
      "Confirmer le paiement",
      `Payer ${formatCurrency(finalMontant)} pour ${selectedMember?.utilisateur?.nom_complet}?\n\nReste à payer après: ${formatCurrency(montantRestant - finalMontant)}`,
      [
        { text: "Annuler", onPress: () => {}, style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            payWithSavings.mutate(
              {
                renflouementId: selectedRenflouement.id,
                montant: finalMontant,
                notes: notes.trim(),
              },
              {
                onSuccess: () => {
                  reset();
                  onClose();
                  onSuccess();
                  Alert.alert(
                    "✅ Succès",
                    `Paiement de ${formatCurrency(finalMontant)} effectué avec succès depuis l'épargne !`,
                    [{ text: "OK", style: "default" }]
                  );
                },
                onError: (error: any) => {
                  let errorMessage = "Impossible d'effectuer le paiement avec l'épargne.";
                  const responseData = error?.response?.data;
                  
                  if (responseData) {
                    if (responseData.error) {
                      errorMessage = responseData.error;
                    } else if (responseData.details) {
                      errorMessage = responseData.details;
                    } else if (responseData.message) {
                      errorMessage = responseData.message;
                    } else if (typeof responseData === 'object') {
                      const firstKey = Object.keys(responseData)[0];
                      if (firstKey && Array.isArray(responseData[firstKey])) {
                        errorMessage = responseData[firstKey][0];
                      } else if (firstKey && typeof responseData[firstKey] === 'string') {
                        errorMessage = responseData[firstKey];
                      }
                    }
                  } else if (error?.message) {
                    errorMessage = error.message;
                  }

                  Alert.alert("Erreur", errorMessage, [{ text: "OK", style: "default" }]);
                },
              }
            );
          },
          style: "default",
        },
      ]
    );
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!selectedRenflouement || montantSaisi <= 0) return;

    // Confirmation Alert
    Alert.alert(
      "Confirmer le paiement",
      `Payer ${formatCurrency(montantSaisi)} pour ${selectedMember?.utilisateur?.nom_complet}?\n\nReste à payer après: ${formatCurrency(montantRestant - montantSaisi)}`,
      [
        { text: "Annuler", onPress: () => {}, style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            createPayment.mutate(
              {
                renflouement: selectedRenflouement.id,
                montant: montantSaisi,
                notes: notes.trim(),
              },
              {
                onSuccess: () => {
                  reset();
                  onClose();
                  onSuccess();
                  Alert.alert(
                    "✅ Succès",
                    `Paiement de ${formatCurrency(montantSaisi)} enregistré avec succès !`,
                    [{ text: "OK", style: "default" }]
                  );
                },
                onError: (err: any) => {
                  let errorMessage = "Impossible d'enregistrer le paiement.";
                  
                  if (err?.response?.data?.error) {
                    errorMessage = err.response.data.error;
                  } else if (err?.response?.data?.details) {
                    errorMessage = err.response.data.details;
                  } else if (err?.response?.data?.message) {
                    errorMessage = err.response.data.message;
                  } else if (typeof err?.response?.data === 'object') {
                    const firstKey = Object.keys(err.response.data)[0];
                    if (firstKey && Array.isArray(err.response.data[firstKey])) {
                      errorMessage = err.response.data[firstKey][0];
                    } else if (firstKey && typeof err.response.data[firstKey] === 'string') {
                      errorMessage = err.response.data[firstKey];
                    }
                  } else if (err?.message) {
                    errorMessage = err.message;
                  }

                  Alert.alert("❌ Erreur", errorMessage, [{ text: "OK", style: "default" }]);
                },
              }
            );
          },
          style: "default",
        },
      ]
    );
  };

  // Membres filtrés + paginés
  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) =>
      (m.utilisateur?.nom_complet ?? "").toLowerCase().includes(q) ||
      (m.numero_membre ?? "").toLowerCase().includes(q) ||
      (m.utilisateur?.email ?? "").toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const paginatedMembers = filteredMembers.slice(0, memberPage);
  const hasMoreMembers   = memberPage < filteredMembers.length;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={ms.overlay}>
          <View style={ms.sheet}>

            {/* ── Header ── */}
            <LinearGradient colors={[TEAL, TEAL2]} style={ms.header}>
              {/* Indicateur d'étapes */}
              <View style={ms.stepBar}>
                {([1, 2, 3, 4] as const).map((s) => (
                  <View key={s} style={ms.stepBarItem}>
                    <View style={[ms.stepDot, step >= s && ms.stepDotActive]}>
                      {step > s
                        ? <Ionicons name="checkmark" size={10} color={TEAL} />
                        : <Text style={[ms.stepNum, step === s && { color: TEAL }]}>{s}</Text>}
                    </View>
                    {s < 4 && <View style={[ms.stepLine, step > s && ms.stepLineActive]} />}
                  </View>
                ))}
              </View>
              <View style={ms.headerRow}>
                <TouchableOpacity onPress={handleClose} style={ms.closeBtn}>
                  <Ionicons name="close" size={22} color="white" />
                </TouchableOpacity>
                <Text style={ms.headerTitle}>{STEP_LABELS[step]}</Text>
                <View style={{ width: 36 }} />
              </View>
            </LinearGradient>

            {/* ══ STEP 1 : Choisir un membre ══ */}
            {step === 1 && (
              <>
                {/* Filtres EN_REGLE / Tous */}
                <View style={ms.filterRow}>
                  <TouchableOpacity
                    style={[ms.filterChip, memberFilter === "EN_REGLE" && ms.filterChipActive]}
                    onPress={() => { setMemberFilter("EN_REGLE"); setMemberPage(MODAL_ITEMS_PER_PAGE); }}
                  >
                    <Text style={[ms.filterChipText, memberFilter === "EN_REGLE" && { color: "white" }]}>En règle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.filterChip, memberFilter === "all" && ms.filterChipActive]}
                    onPress={() => { setMemberFilter("all"); setMemberPage(MODAL_ITEMS_PER_PAGE); }}
                  >
                    <Text style={[ms.filterChipText, memberFilter === "all" && { color: "white" }]}>Tous</Text>
                  </TouchableOpacity>
                </View>

                {/* Recherche */}
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
                <Text style={ms.resultCount}>{filteredMembers.length} membre{filteredMembers.length !== 1 ? "s" : ""}</Text>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.listPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {loadingMembers ? (
                    <View style={ms.center}><ActivityIndicator size="large" color={TEAL} /></View>
                  ) : filteredMembers.length === 0 ? (
                    <View style={ms.center}>
                      <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                      <Text style={ms.emptyText}>Aucun membre trouvé</Text>
                    </View>
                  ) : (
                    <>
                      {paginatedMembers.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={ms.memberCard}
                          onPress={() => { setSelectedMember(m); setStep(2); }}
                          activeOpacity={0.8}
                        >
                          <LinearGradient colors={[TEAL, TEAL2]} style={ms.memberAvatar}>
                            <Text style={ms.memberInitials}>{getInitials(m.utilisateur?.nom_complet ?? "")}</Text>
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <Text style={ms.memberName}>{m.utilisateur?.nom_complet}</Text>
                            <Text style={ms.memberNumero}>{m.numero_membre}</Text>
                            <Text style={ms.memberEmail} numberOfLines={1}>{m.utilisateur?.email}</Text>
                          </View>
                          <View style={[ms.statusBadge, {
                            backgroundColor: (m.statut === "EN_REGLE" ? COLORS.success : COLORS.warning) + "20"
                          }]}>
                            <Text style={[ms.statusText, {
                              color: m.statut === "EN_REGLE" ? COLORS.success : COLORS.warning
                            }]}>
                              {m.statut === "EN_REGLE" ? "En règle" : m.statut ?? "—"}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                        </TouchableOpacity>
                      ))}
                      {hasMoreMembers && (
                        <TouchableOpacity style={ms.loadMore} onPress={() => setMemberPage((p) => p + MODAL_ITEMS_PER_PAGE)}>
                          <Text style={ms.loadMoreText}>
                            Voir plus ({filteredMembers.length - memberPage} restant{filteredMembers.length - memberPage > 1 ? "s" : ""})
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={TEAL} />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            )}

            {/* ══ STEP 2 : Renflouements du membre ══ */}

            {/* ══ STEP 3 : Sélectionner un renflouement non soldé ══ */}
            {step === 2 && selectedMember && (
              <>
                <LinearGradient colors={[TEAL + "18", TEAL2 + "0A"]} style={ms.banner}>
                  <LinearGradient colors={[TEAL, TEAL2]} style={[ms.memberAvatar, { width: 40, height: 40, borderRadius: 20 }]}>
                    <Text style={[ms.memberInitials, { fontSize: FONT_SIZES.sm }]}>
                      {getInitials(selectedMember.utilisateur?.nom_complet ?? "")}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.bannerName}>{selectedMember.utilisateur?.nom_complet}</Text>
                    <Text style={ms.bannerSub}>{nonSoldes.length} renflouement{nonSoldes.length !== 1 ? "s" : ""} non soldé{nonSoldes.length !== 1 ? "s" : ""}</Text>
                  </View>
                </LinearGradient>

                <Text style={[ms.resultCount, { paddingHorizontal: SPACING.lg }]}>
                  Sélectionnez le renflouement à payer
                </Text>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.listPad} showsVerticalScrollIndicator={false}>
                  {nonSoldes.map((r) => {
                    const isSelected = selectedRenflouement?.id === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[ms.renflSelectCard, isSelected && ms.renflSelectCardActive]}
                        onPress={() => setSelectedRenflouement(r)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={ms.renflSelectCause}>
                            {r.cause || r.type_cause_display || "Renflouement"}
                          </Text>
                          <Text style={ms.renflSelectDate}>{formatDate(r.date_creation)}</Text>
                          <View style={ms.renflSelectAmounts}>
                            <Text style={ms.renflSelectDu}>Dû : {formatCurrency(r.montant_du)}</Text>
                            <Text style={[ms.renflSelectRestant, { color: COLORS.error }]}>
                              Restant : {formatCurrency(r.montant_restant)}
                            </Text>
                          </View>
                          {/* Mini barre progression */}
                          <View style={ms.progressBg2}>
                            <View style={[ms.progressFill2, {
                              width: `${Math.min(100, r.pourcentage_paye || 0)}%` as any,
                              backgroundColor: TEAL,
                            }]} />
                          </View>
                        </View>
                        <View style={ms.selectIndicator}>
                          {isSelected
                            ? <Ionicons name="checkmark-circle" size={24} color={TEAL} />
                            : <View style={ms.selectCircle} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={{ height: 20 }} />
                </ScrollView>

                <View style={ms.navRow}>
                  <TouchableOpacity style={ms.backBtn} onPress={() => { setSelectedRenflouement(null); setStep(1); }}>
                    <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                    <Text style={ms.backBtnText}>Retour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.nextBtn, !selectedRenflouement && { opacity: 0.4 }]}
                    onPress={() => setStep(3)}
                    disabled={!selectedRenflouement}
                  >
                    <LinearGradient colors={[TEAL, TEAL2]} style={ms.nextBtnGrad}>
                      <Text style={ms.nextBtnText}>Continuer</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ══ STEP 4 : Saisir le montant ══ */}
            {step === 3 && selectedMember && selectedRenflouement && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.stepPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Bannières membre + renflouement sélectionné */}
                <LinearGradient colors={[TEAL + "18", TEAL2 + "0A"]} style={ms.banner}>
                  <LinearGradient colors={[TEAL, TEAL2]} style={[ms.memberAvatar, { width: 40, height: 40, borderRadius: 20 }]}>
                    <Text style={[ms.memberInitials, { fontSize: FONT_SIZES.sm }]}>
                      {getInitials(selectedMember.utilisateur?.nom_complet ?? "")}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.bannerName}>{selectedMember.utilisateur?.nom_complet}</Text>
                    <Text style={ms.bannerSub} numberOfLines={1}>
                      {selectedRenflouement.cause || selectedRenflouement.type_cause_display || "Renflouement"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep(3)} style={ms.changeBtn}>
                    <Text style={ms.changeBtnText}>Changer</Text>
                  </TouchableOpacity>
                </LinearGradient>

                {/* Infos renflouement */}
                <View style={ms.infoGrid}>
                  <InfoTile label="Montant dû"     value={formatCurrency(selectedRenflouement.montant_du)}      color={TEAL}           icon="cash" />
                  <InfoTile label="Déjà payé"      value={formatCurrency(selectedRenflouement.montant_paye)}    color={COLORS.success} icon="checkmark-circle" />
                  <InfoTile label="Restant à payer" value={formatCurrency(selectedRenflouement.montant_restant)} color={COLORS.error}   icon="time" />
                  <InfoTile label="Avancement"     value={`${(selectedRenflouement.pourcentage_paye || 0).toFixed(0)}%`} color={COLORS.primary} icon="bar-chart" />
                </View>

                {/* Saisie montant */}
                <Text style={ms.label}>
                  Montant à payer <Text style={{ color: COLORS.error }}>*</Text>
                </Text>
                <View style={[ms.amountBox, montantInvalide && amount.length > 0 && { borderColor: COLORS.error + "80" }]}>
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

                {/* Règles */}
                {amount.length > 0 && (
                  <>
                    {montantSaisi <= 0 && (
                      <View style={ms.warnBox}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={ms.warnText}>Le montant doit être supérieur à 0</Text>
                      </View>
                    )}
                    {montantSaisi > 0 && !Number.isInteger(montantSaisi) && (
                      <View style={ms.warnBox}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={ms.warnText}>Le montant doit être un nombre entier</Text>
                      </View>
                    )}
                    {(montantSaisi > parseInt(String(montantRestant)) + 100) && (
                      <View style={ms.warnBox}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={ms.warnText}>
                          Dépasse le restant dû ({formatCurrency(montantRestant)}) (marge de 100 FCFA seulement)
                        </Text>
                      </View>
                    )}
                    {montantSaisi > 0 && montantSaisi <= parseInt(String(montantRestant)) && Number.isInteger(montantSaisi) && (
                      <LinearGradient colors={[TEAL + "18", TEAL2 + "0A"]} style={ms.preview}>
                        <View style={ms.previewRow}>
                          <Text style={ms.previewLabel}>Paiement</Text>
                          <Text style={[ms.previewValue, { color: TEAL }]}>{formatCurrency(montantSaisi)}</Text>
                        </View>
                        <View style={ms.previewRow}>
                          <Text style={ms.previewLabel}>Restant après</Text>
                          <Text style={[ms.previewValue, { color: montantRestant - montantSaisi === 0 ? COLORS.success : COLORS.warning }]}>
                            {formatCurrency(montantRestant - montantSaisi)}
                          </Text>
                        </View>
                        {montantRestant - montantSaisi === 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                            <Text style={{ fontSize: FONT_SIZES.sm, color: COLORS.success, fontWeight: "700" }}>
                              Ce paiement solde entièrement le renflouement
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    )}
                  </>
                )}

                <Text style={[ms.label, { marginTop: SPACING.md }]}>Notes (optionnel)</Text>
                <TextInput
                  style={ms.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Remarques sur ce paiement…"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />

                <View style={ms.navRow}>
                  <TouchableOpacity style={ms.backBtn} onPress={() => setStep(2)}>
                    <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                    <Text style={ms.backBtnText}>Retour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.nextBtn, montantInvalide && { opacity: 0.4 }]}
                    onPress={() => setStep(4)}
                    disabled={montantInvalide}
                  >
                    <LinearGradient colors={[TEAL, TEAL2]} style={ms.nextBtnGrad}>
                      <Text style={ms.nextBtnText}>Continuer</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {/* ══ STEP 5 : Récapitulatif ══ */}
            {step === 4 && selectedMember && selectedRenflouement && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.stepPad} showsVerticalScrollIndicator={false}>
                <Text style={ms.resumeTitle}>Récapitulatif</Text>

                <View style={ms.resumeCard}>
                  <RRow icon="person"          label="Membre"           value={selectedMember.utilisateur?.nom_complet ?? "—"} />
                  <RRow icon="card"            label="Numéro"           value={selectedMember.numero_membre} />
                  <RRow icon="information-circle" label="Renflouement"  value={selectedRenflouement.cause || selectedRenflouement.type_cause_display || "—"} />
                  <View style={ms.divider} />
                  <RRow icon="cash"            label="Montant dû"       value={formatCurrency(selectedRenflouement.montant_du)} />
                  <RRow icon="checkmark-circle" label="Déjà payé"       value={formatCurrency(selectedRenflouement.montant_paye)} />
                  <RRow icon="arrow-up-circle" label="Ce paiement"      value={formatCurrency(montantSaisi)} valueColor={TEAL} bold />
                  <RRow icon="time"            label="Restant après"    value={formatCurrency(montantRestant - montantSaisi)} valueColor={montantRestant - montantSaisi === 0 ? COLORS.success : COLORS.warning} />
                  {notes.trim() && (
                    <RRow icon="chatbubble-outline" label="Notes"       value={notes.trim()} />
                  )}
                </View>

                {montantRestant - montantSaisi === 0 && (
                  <View style={[ms.warnBox, { backgroundColor: COLORS.success + "15" }]}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={[ms.warnText, { color: COLORS.success }]}>Ce paiement solde entièrement ce renflouement</Text>
                  </View>
                )}

                <View style={ms.navRow}>
                  <TouchableOpacity style={ms.backBtn} onPress={() => setStep(3)}>
                    <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                    <Text style={ms.backBtnText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.nextBtn, (createPayment.isPending || payWithSavings.isPending) && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={createPayment.isPending || payWithSavings.isPending}
                  >
                    <LinearGradient colors={[COLORS.primary, "#3A86FF"]} style={ms.nextBtnGrad}>
                      {createPayment.isPending ? <ActivityIndicator size="small" color="white" /> : (
                        <>
                          <Ionicons name="cash" size={18} color="white" />
                          <Text style={ms.nextBtnText}>Payer (caisse)</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ms.nextBtn, (createPayment.isPending || payWithSavings.isPending) && { opacity: 0.6 }]}
                    onPress={handleSavingsPayment}
                    disabled={createPayment.isPending || payWithSavings.isPending}
                  >
                    <LinearGradient colors={[TEAL, TEAL2]} style={ms.nextBtnGrad}>
                      {payWithSavings.isPending ? <ActivityIndicator size="small" color="white" /> : (
                        <>
                          <Ionicons name="wallet-outline" size={18} color="white" />
                          <Text style={ms.nextBtnText}>Payer (épargne)</Text>
                        </>
                      )}
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

// ── Sous-composants ──────────────────────────────────────────────────────────
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
  tile:  { width: "48%", backgroundColor: "white", borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: TEAL + "30", alignItems: "center" },
  icon:  { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  label: { fontSize: 10, color: COLORS.textSecondary, textAlign: "center", marginBottom: 2 },
  value: { fontSize: FONT_SIZES.sm, fontWeight: "800", textAlign: "center" },
});

const RRow = ({ icon, label, value, valueColor, bold }: {
  icon: string; label: string; value: string; valueColor?: string; bold?: boolean;
}) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}>
    <Ionicons name={icon as any} size={16} color={COLORS.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
    <Text style={{ flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary }}>{label}</Text>
    <Text style={{ fontSize: FONT_SIZES.sm, color: valueColor || COLORS.text, fontWeight: bold ? "800" : "600", textAlign: "right", maxWidth: "55%" }}>{value}</Text>
  </View>
);

// ─── Styles du modal ──────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay:            { flex: 1, justifyContent: "flex-end" },
  sheet:              { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "92%", overflow: "hidden" },
  header:             { paddingTop: SPACING.md, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  stepBar:            { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  stepBarItem:        { flexDirection: "row", alignItems: "center" },
  stepDot:            { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  stepDotActive:      { backgroundColor: "white" },
  stepNum:            { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  stepLine:           { width: 20, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 2 },
  stepLineActive:     { backgroundColor: "white" },
  headerRow:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle:        { fontSize: FONT_SIZES.lg, fontWeight: "800", color: "white", flex: 1, textAlign: "center" },
  filterRow:          { flexDirection: "row", paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm },
  filterChip:         { paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive:   { backgroundColor: TEAL, borderColor: TEAL },
  filterChipText:     { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },
  searchBox:          { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: SPACING.lg, marginBottom: SPACING.sm, borderRadius: 14, paddingHorizontal: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput:        { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, paddingVertical: 12 },
  resultCount:        { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  listPad:            { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  stepPad:            { paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: SPACING.sm },
  center:             { alignItems: "center", paddingVertical: 40 },
  emptyText:          { fontSize: FONT_SIZES.md, color: COLORS.textLight, marginTop: SPACING.md, textAlign: "center" },
  memberCard:         { backgroundColor: "white", borderRadius: 14, padding: SPACING.md, flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm, borderWidth: 1, borderColor: TEAL + "30", elevation: 1 },
  memberAvatar:       { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  memberInitials:     { color: "white", fontWeight: "800", fontSize: FONT_SIZES.md },
  memberName:         { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  memberNumero:       { fontSize: FONT_SIZES.sm, color: TEAL, fontWeight: "600" },
  memberEmail:        { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  statusBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:         { fontSize: 11, fontWeight: "700" },
  loadMore:           { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: 6 },
  loadMoreText:       { fontSize: FONT_SIZES.sm, color: TEAL, fontWeight: "600" },
  banner:             { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: SPACING.md, marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  bannerName:         { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  bannerSub:          { fontSize: FONT_SIZES.sm, color: TEAL },
  changeBtn:          { backgroundColor: "white", paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: TEAL + "40" },
  changeBtnText:      { fontSize: 12, color: TEAL, fontWeight: "600" },
  summaryBox:         { flexDirection: "row", backgroundColor: "white", borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: TEAL + "30" },
  summaryItem:        { flex: 1, alignItems: "center" },
  summaryLabel:       { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  summaryValue:       { fontSize: FONT_SIZES.lg, fontWeight: "800" },
  renflCard:          { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  renflDot:           { width: 10, height: 10, borderRadius: 5 },
  renflCause:         { fontSize: FONT_SIZES.sm, fontWeight: "700", color: COLORS.text },
  renflDate:          { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  renflMontant:       { fontSize: FONT_SIZES.sm, fontWeight: "800" },
  renflTotal:         { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  renflSelectCard:    { backgroundColor: "white", borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 2, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  renflSelectCardActive: { borderColor: TEAL, backgroundColor: TEAL + "08" },
renflSelectCause: {
  fontSize: FONT_SIZES.md,
  fontWeight: "700",
  color: COLORS.text,
  marginBottom: 2,
  flexShrink: 1,
},
  renflSelectDate:    { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  renflSelectAmounts: { flexDirection: "row", gap: SPACING.md, marginBottom: 4 },
  renflSelectDu:      { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  renflSelectRestant: { fontSize: FONT_SIZES.sm, fontWeight: "700" },
  progressBg2:        { height: 4, backgroundColor: "#F0F0F0", borderRadius: 2 },
  progressFill2:      { height: 4, borderRadius: 2 },
  selectIndicator:    { width: 28, alignItems: "center" },
  selectCircle:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border },
  infoGrid:           { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginVertical: SPACING.md },
  label:              { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm },
  amountBox:          { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 16, borderWidth: 2, borderColor: TEAL + "40", paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  amountInput:        { flex: 1, fontSize: 28, fontWeight: "800", color: COLORS.text, paddingVertical: SPACING.md },
  amountUnit:         { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: "600" },
  warnBox:            { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.error + "10", borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.sm },
  warnText:           { fontSize: FONT_SIZES.sm, color: COLORS.error, flex: 1 },
  preview:            { borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md },
  previewRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  previewLabel:       { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  previewValue:       { fontSize: FONT_SIZES.md, fontWeight: "700" },
  notesInput:         { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.text, height: 80, textAlignVertical: "top" },
navRow: {
  flexDirection: "row",
  gap: SPACING.sm,
  marginTop: SPACING.lg,
  paddingHorizontal: SPACING.lg,
},
  backBtn:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  backBtnText:        { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.textSecondary },
  bottomBack:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
nextBtn: {
  flex: 1, // au lieu de 2
  borderRadius: 14,
  overflow: "hidden",
},
  nextBtnGrad:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, paddingVertical: SPACING.md },
  nextBtnText:        { fontSize: FONT_SIZES.md, fontWeight: "700", color: "white" },
  resumeTitle:        { fontSize: FONT_SIZES.lg, fontWeight: "800", color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.md },
  resumeCard:         { backgroundColor: "white", borderRadius: 18, padding: SPACING.lg, borderWidth: 1, borderColor: TEAL + "30", marginBottom: SPACING.lg },
  divider:            { height: 1, backgroundColor: "#F0F0F0", marginVertical: SPACING.sm },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function RenflouementScreen() {
  const { user }    = useAuthContext();
  const readOnly    = !user?.can_write;
  const navigation  = useNavigation<any>();

  const [showModal, setShowModal]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "solde" | "partiel">("all");
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  // Données des paiements
  const { data: paymentsData, isLoading, isError, refetch }             = useRenflouementPayments();
  const payments: RenflouementPayment[] = useMemo(() => normalizeArray(paymentsData), [paymentsData]);

  // Filtrage + recherche
  const filteredPayments = useMemo(() => {
    let list = payments;
    if (filterStatus === "solde")    list = list.filter((p) => p.renflouement_info.montant_restant <= 0);
    if (filterStatus === "partiel")  list = list.filter((p) => p.renflouement_info.montant_restant > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.membre_nom ?? "").toLowerCase().includes(q) ||
        (p.membre_numero ?? "").toLowerCase().includes(q) ||
        (p.notes ?? "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.date_paiement).getTime() - new Date(a.date_paiement).getTime());
  }, [payments, filterStatus, search]);

  const paginatedPayments = useMemo(() => filteredPayments.slice(0, displayedItems), [filteredPayments, displayedItems]);
  const hasMore = displayedItems < filteredPayments.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } catch {}
    setRefreshing(false);
  };

  const handleSuccess = () => refetch();

  // Stats calculées à partir des paiements
  const totalPayements = payments.reduce((s, p) => s + parseFloat(p.montant || "0"), 0);
  const nbrSoldes = payments.filter((p) => p.renflouement_info.montant_restant <= 0).length;
  const nbrPartiels = payments.filter((p) => p.renflouement_info.montant_restant > 0).length;

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <LinearGradient colors={[TEAL, TEAL2]} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Ionicons name="card-outline" size={32} color="white" style={{ marginBottom: SPACING.sm }} />
          <Text style={s.headerTitle}>Paiements de renflouements</Text>
          <Text style={s.headerSubtitle}>Historique des contributions payées</Text>
        </View>
        {/* Pills résumé */}
        {/* <View style={s.pillsRow}>
          <View style={s.pill}><Text style={s.pillVal}>{payments.length}</Text><Text style={s.pillLab}>Total paiements</Text></View>
          <View style={s.pill}><Text style={s.pillVal}>{nbrSoldes}</Text><Text style={s.pillLab}>Soldés</Text></View>
          <View style={s.pill}><Text style={s.pillVal}>{nbrPartiels}</Text><Text style={s.pillLab}>Partiels</Text></View>
        </View> */}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <View /> as any // replaced par RefreshControl si besoin
        }
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y < -60 && !refreshing) handleRefresh();
        }}
      >
        {/* ── Stats détaillées ── */}
        <View style={s.statsSection}>
          <StatCard title="Total paiements"      value={formatCurrency(totalPayements)}      icon="cash-outline"     color={TEAL}          subtitle={`${payments.length} paiement${payments.length > 1 ? "s" : ""}`} />
          <StatCard title="Renflouements soldés" value={`${nbrSoldes}`}                       icon="checkmark-circle" color={COLORS.success} subtitle={`${nbrSoldes} complètement payé${nbrSoldes > 1 ? "s" : ""}`} />
          <StatCard title="Renflouements partiels" value={`${nbrPartiels}`}                   icon="time-outline"     color={COLORS.warning} subtitle={`${nbrPartiels} en cours de paiement`} />
        </View>

        {/* ── Barre outils ── */}
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
              <LinearGradient colors={[TEAL, TEAL2]} style={s.addBtnGrad}>
                <Ionicons name="add" size={18} color="white" />
                <Text style={s.addBtnText}>Payer</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filtres ── */}
        <View style={s.filters}>
          {(["all", "partiel", "solde"] as const).map((key) => {
            const labels: Record<string, string> = { all: "Tous", partiel: "Partiels", solde: "Soldés" };
            const active = filterStatus === key;
            const dotColor = key === "partiel" ? COLORS.warning : key === "solde" ? COLORS.success : TEAL;
            return (
              <TouchableOpacity
                key={key}
                style={[s.filterChip, active && { backgroundColor: dotColor, borderColor: dotColor }]}
                onPress={() => { setFilterStatus(key); setDisplayedItems(ITEMS_PER_PAGE); }}
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
              <ActivityIndicator size="large" color={TEAL} />
              <Text style={s.loadingText}>Chargement…</Text>
            </View>
          ) : isError ? (
            <View style={s.center}>
              <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
              <Text style={[s.loadingText, { color: COLORS.error }]}>Erreur de chargement</Text>
              <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
                <Text style={s.retryBtnText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : filteredPayments.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="card-outline" size={48} color={COLORS.textLight} />
              </View>
              <Text style={s.emptyTitle}>Aucun paiement</Text>
              <Text style={s.emptyText}>
                {search ? "Aucun résultat pour cette recherche" : "Aucun paiement de renflouement enregistré"}
              </Text>
            </View>
          ) : (
            <>
              <View style={s.counter}>
                <Ionicons name="list" size={16} color={TEAL} />
                <Text style={s.counterText}>
                  <Text style={s.counterBold}>{paginatedPayments.length}</Text>
                  {" "}sur{" "}
                  <Text style={s.counterBold}>{filteredPayments.length}</Text>
                  {" "}paiement{filteredPayments.length > 1 ? "s" : ""}
                </Text>
              </View>

              {paginatedPayments.map((item) => (
                <RenflouementPaymentCard key={item.id} item={item} />
              ))}

              {hasMore && (
                <TouchableOpacity
                  style={s.loadMore}
                  onPress={() => setDisplayedItems((p) => p + ITEMS_PER_PAGE)}
                >
                  <LinearGradient colors={[TEAL, TEAL2]} style={s.loadMoreGrad}>
                    <Text style={s.loadMoreText}>
                      Voir plus ({filteredPayments.length - displayedItems} restant{filteredPayments.length - displayedItems > 1 ? "s" : ""})
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
        onSuccess={handleSuccess}
      />
    </View>
  );
}

// ─── Styles écran principal ───────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#F0FDFA" },
  header:         { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 10, paddingBottom: SPACING.lg },
  backButton:     { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  headerContent:  { alignItems: "center", marginBottom: SPACING.lg },
  headerTitle:    { fontSize: FONT_SIZES.xxl, fontWeight: "800", color: "white", marginBottom: 4 },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: "rgba(255,255,255,0.8)" },
  pillsRow:       { flexDirection: "row", gap: SPACING.sm },
  pill:           { flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingVertical: SPACING.sm, paddingHorizontal: 4 },
  pillVal:        { fontSize: FONT_SIZES.sm, fontWeight: "800", color: "white" },
  pillLab:        { fontSize: 9, color: "rgba(255,255,255,0.8)", textAlign: "center" },
  statsSection:   { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  toolbar:        { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, gap: SPACING.md },
  searchBox:      { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, paddingHorizontal: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: TEAL + "30" },
  searchInput:    { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, paddingVertical: 10 },
  addBtn:         { borderRadius: 12, overflow: "hidden" },
  addBtnGrad:     { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 6 },
  addBtnText:     { color: "white", fontSize: FONT_SIZES.sm, fontWeight: "700" },
  filters:        { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, gap: SPACING.sm },
  filterChip:     { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: TEAL + "30" },
  filterChipText: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },
  listSection:    { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  counter:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: TEAL + "12", borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: 8, marginBottom: SPACING.md },
  counterText:    { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  counterBold:    { fontWeight: "700", color: TEAL },
  center:         { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  loadingText:    { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.md },
  retryBtn:       { marginTop: SPACING.md, backgroundColor: TEAL, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: 12 },
  retryBtnText:   { color: "white", fontWeight: "700", fontSize: FONT_SIZES.md },
  empty:          { alignItems: "center", paddingVertical: 60 },
  emptyIcon:      { width: 90, height: 90, borderRadius: 45, backgroundColor: TEAL + "15", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  emptyTitle:     { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  emptyText:      { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: "center", paddingHorizontal: SPACING.xl },
  loadMore:       { marginTop: SPACING.md, marginBottom: SPACING.md, borderRadius: 14, overflow: "hidden" },
  loadMoreGrad:   { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: SPACING.sm },
  loadMoreText:   { fontSize: FONT_SIZES.md, fontWeight: "600", color: "white" },
});