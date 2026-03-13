import React, { useState, useRef, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Animated, Dimensions, StatusBar, Modal, TextInput,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useLoans, useRepayments } from "../../hooks/useLoan";
import { useSolidarityPayments } from "../../hooks/useSolidarity";
import { useRenflouements } from "../../hooks/useRenflouement";
import { useSavings } from "../../hooks/useSaving";
import { useAssistances } from "../../hooks/useAssistance";
import { useInscriptionPayments } from "../../hooks/useInscription";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExercises } from "../../hooks/useExercise";
import { useSessions } from "../../hooks/useSession";
import { useMembers } from "../../hooks/useMember";
import { Exercise } from "../../types/exercise.types";
import { Session } from "../../types/session.types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const EXERCISES_PER_PAGE = 6;
const OPS_PER_PAGE = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineItem = {
  id: string;
  type: "emprunt" | "remboursement" | "solidarite" | "renflouement"
      | "epargne"  | "assistance"   | "paiement-inscription";
  date: string;
  amount: number;
  data: any;
  status?: string;
  memberName?: string;
  memberNumero?: string;
};

// Paramètres transmis depuis AdminDashboardScreen
// Les IDs sont des UUID (strings), pas des numbers
type RouteParams = {
  sessionId?: string | null;
  exerciceId?: string | null;
  sessionName?: string;
  exerciceName?: string;
};

// ─── Design system ────────────────────────────────────────────────────────────

const THEME = {
  colors: {
    primary: { 50: "#EFF6FF", 500: COLORS.primary, 600: "#2563EB" },
    success: { 50: "#ECFDF5", 500: "#10B981", 600: "#059669" },
    warning: { 50: "#FFF7ED", 500: "#F97316", 600: "#EA580C" },
    error:   { 50: "#FEF2F2", 500: "#EF4444", 600: "#DC2626" },
    neutral: { 100: "#F5F5F5", 200: "#E5E5E5", 300: "#D4D4D4",
               400: "#A3A3A3", 500: "#737373", 600: "#525252",
               700: "#404040", 800: "#262626" },
    admin:   { 50: "#F0FDF4", 500: "#22C55E", 600: "#16A34A" },
  },
  gradients: {
    primary:   ["#3B82F6", "#2563EB"]   as [string, string],
    admin:     ["#22C55E", "#16A34A"]   as [string, string],
    teal:      ["#14B8A6", "#0D9488"]   as [string, string],
    pink:      ["#EC4899", "#BE185D"]   as [string, string],
    orange:    ["#F97316", "#EA580C"]   as [string, string],
    purple:    ["#A855F7", "#7C3AED"]   as [string, string],
    green:     ["#10B981", "#059669"]   as [string, string],
    red:       ["#EF4444", "#DC2626"]   as [string, string],
    cyan:      ["#06B6D4", "#0891B2"]   as [string, string],
    dark:      ["#334155", "#1E293B"]   as [string, string],
  },
};

const OPERATION_CONFIG = {
  emprunt:              { label: "Emprunts",       icon: "trending-up",       gradient: THEME.gradients.orange,  lightBg: "#FFF7ED", textColor: "#EA580C" },
  remboursement:        { label: "Remboursements",  icon: "arrow-down-circle", gradient: THEME.gradients.green,   lightBg: "#ECFDF5", textColor: "#059669" },
  solidarite:           { label: "Solidarité",      icon: "people",            gradient: THEME.gradients.teal,    lightBg: "#F0FDFA", textColor: "#0D9488" },
  renflouement:         { label: "Renflouements",   icon: "refresh-circle",    gradient: THEME.gradients.red,     lightBg: "#FEF2F2", textColor: "#DC2626" },
  epargne:              { label: "Épargnes",        icon: "wallet",            gradient: THEME.gradients.pink,    lightBg: "#FDF2F8", textColor: "#BE185D" },
  assistance:           { label: "Assistances",     icon: "heart",             gradient: THEME.gradients.purple,  lightBg: "#FAF5FF", textColor: "#7C3AED" },
  "paiement-inscription": { label: "Inscriptions", icon: "school",            gradient: THEME.gradients.cyan,    lightBg: "#ECFEFF", textColor: "#0891B2" },
} as const;

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const formatMoney = (val: number | string | undefined): string => {
  if (typeof val === "string") val = parseFloat(val);
  if (typeof val !== "number" || isNaN(val)) return "0 FCFA";
  return val.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " FCFA";
};

const formatDateSmart = (dateStr: string): string => {
  if (!dateStr) return "--";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7)  return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateStr.slice(0, 10); }
};

const arr = (raw: any): any[] =>
  Array.isArray(raw) ? raw : raw?.results ?? raw?.assistances ?? [];

const extractMemberName = (obj: any): string | undefined =>
  obj?.membre_info?.nom_complet         ||
  obj?.membre?.nom_complet              ||
  obj?.membre_nom_complet               ||
  undefined;

const extractMemberNumero = (obj: any): string | undefined =>
  obj?.membre_info?.numero_membre       ||
  obj?.membre?.numero_membre            ||
  obj?.membre_numero                    ||
  undefined;

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

const Breadcrumb = ({ exercice, session, onReset, onBackToExercice }: {
  exercice: Exercise | null; session: Session | null;
  onReset: () => void; onBackToExercice: () => void;
}) => (
  <View style={s.breadcrumb}>
    <TouchableOpacity onPress={onReset}>
      <Text style={[s.crumb, s.crumbLink]}>Exercices</Text>
    </TouchableOpacity>
    {exercice && (
      <>
        <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.5)" />
        <TouchableOpacity onPress={onBackToExercice}>
          <Text style={[s.crumb, session ? s.crumbLink : s.crumbActive]}>{exercice.nom}</Text>
        </TouchableOpacity>
      </>
    )}
    {session && (
      <>
        <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.5)" />
        <Text style={[s.crumb, s.crumbActive]} numberOfLines={1}>{session.nom}</Text>
      </>
    )}
  </View>
);

// ─── Dashboard exercice ───────────────────────────────────────────────────────

const ExerciseDashboard = ({ exercice }: { exercice: Exercise }) => {
  const { data: loansRaw }   = useLoans({ exercice: exercice.id });
  const { data: savingsRaw } = useSavings({ exercice: exercice.id });
  const { data: membersRaw } = useMembers();

  const totalEmprunts  = useMemo(() => arr(loansRaw).reduce((s: number, l: any) => s + (parseFloat(l.montant_emprunte) || 0), 0), [loansRaw]);
  const totalEpargne   = useMemo(() => arr(savingsRaw).reduce((s: number, e: any) => s + (parseFloat(e.montant) || 0), 0), [savingsRaw]);
  const nombreMembres  = arr(membersRaw).length;
  const fondsSocial    = (exercice as any)?.fonds_social_info?.montant_total ?? 0;

  const tiles = [
    { label: "Fonds social",   value: formatMoney(fondsSocial),  icon: "shield-checkmark", gradient: THEME.gradients.teal   },
    { label: "Total emprunts", value: formatMoney(totalEmprunts), icon: "trending-up",      gradient: THEME.gradients.orange },
    { label: "Total épargnes", value: formatMoney(totalEpargne),  icon: "wallet",           gradient: THEME.gradients.pink  },
    { label: "Membres",        value: String(nombreMembres),      icon: "people",           gradient: THEME.gradients.primary},
  ];

  return (
    <View style={s.dashGrid}>
      {tiles.map((t, i) => (
        <LinearGradient key={i} colors={t.gradient} style={s.dashTile}>
          <Ionicons name={t.icon as any} size={22} color="rgba(255,255,255,0.9)" />
          <Text style={s.dashTileValue} numberOfLines={1} adjustsFontSizeToFit>{t.value}</Text>
          <Text style={s.dashTileLabel}>{t.label}</Text>
        </LinearGradient>
      ))}
    </View>
  );
};

// ─── Card exercice ────────────────────────────────────────────────────────────

const ExerciceCard = ({ exercice, onPress }: { exercice: Exercise; onPress: () => void }) => {
  const scale    = useRef(new Animated.Value(1)).current;
  const isActive = exercice.statut === "EN_COURS";

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={s.exerciceCard}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <LinearGradient
          colors={isActive ? THEME.gradients.admin : ["#94A3B8", "#64748B"]}
          style={s.exerciceCardGradient}
        >
          <View style={s.exerciceIconCircle}>
            <Ionicons name="calendar" size={28} color="white" />
          </View>
          <View style={s.exerciceTextBlock}>
            <Text style={s.exerciceNom}>{exercice.nom}</Text>
            {exercice.date_debut && (
              <Text style={s.exerciceDates}>
                {new Date(exercice.date_debut).toLocaleDateString("fr-FR")}
                {exercice.date_fin
                  ? ` → ${new Date(exercice.date_fin).toLocaleDateString("fr-FR")}`
                  : " → En cours"}
              </Text>
            )}
            <View style={s.exerciceStatusBadge}>
              <Text style={s.exerciceStatusText}>
                {isActive ? "● En cours" : "Clôturé"}
              </Text>
            </View>
          </View>
          <View style={s.exerciceArrow}>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Card session ─────────────────────────────────────────────────────────────

const SessionCard = ({ session, onPress }: { session: Session; onPress: () => void }) => {
  const scale  = useRef(new Animated.Value(1)).current;
  const isOpen = session.statut === "EN_COURS";

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={s.sessionCard}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <LinearGradient
          colors={isOpen ? THEME.gradients.primary : ["#94A3B8", "#64748B"]}
          style={s.sessionCardGradient}
        >
          <View style={s.sessionIconCircle}>
            <Ionicons name="folder-open" size={24} color="white" />
          </View>
          <View style={s.sessionTextBlock}>
            <Text style={s.sessionNom}>{session.nom}</Text>
            {session.date_session && (
              <Text style={s.sessionDate}>
                {new Date(session.date_session).toLocaleDateString("fr-FR")}
              </Text>
            )}
            <View style={s.sessionStatusBadge}>
              <Text style={s.sessionStatusText}>{isOpen ? "● Ouverte" : "Fermée"}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Synthèse session ─────────────────────────────────────────────────────────

const SessionSummaryGrid = ({ totals }: { totals: Record<string, number> }) => (
  <View style={s.summaryGrid}>
    {Object.entries(OPERATION_CONFIG).map(([type, cfg]) => {
      const total = totals[type] ?? 0;
      return (
        <LinearGradient key={type} colors={cfg.gradient} style={s.summaryTile}>
          <Ionicons name={cfg.icon as any} size={20} color="rgba(255,255,255,0.9)" />
          <Text style={s.summaryTileLabel}>{cfg.label}</Text>
          <Text style={s.summaryTileValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(total)}
          </Text>
        </LinearGradient>
      );
    })}
  </View>
);

// ─── Filtre chips ─────────────────────────────────────────────────────────────

const FilterChips = ({ selected, onChange }: { selected: string; onChange: (k: string) => void }) => {
  const filters = [
    { key: "all",                  label: "Tout",           icon: "list"             },
    { key: "emprunt",              label: "Emprunts",       icon: "trending-up"      },
    { key: "remboursement",        label: "Remboursements", icon: "arrow-down-circle" },
    { key: "solidarite",           label: "Solidarité",     icon: "people"           },
    { key: "renflouement",         label: "Renflouements",  icon: "refresh-circle"   },
    { key: "epargne",              label: "Épargnes",       icon: "wallet"           },
    { key: "assistance",           label: "Assistances",    icon: "heart"            },
    { key: "paiement-inscription", label: "Inscriptions",   icon: "school"           },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
      <View style={s.filterRow}>
        {filters.map((f) => {
          const active = selected === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => onChange(f.key)}
            >
              <Ionicons name={f.icon as any} size={13} color={active ? "white" : THEME.colors.neutral[600]} />
              <Text style={[s.filterChipText, active && { color: "white" }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ─── Barre de recherche par membre ───────────────────────────────────────────

const MemberSearchBar = ({
  searchText, onSearchChange, selectedFilter, filteredCount, totalCount,
}: {
  searchText: string; onSearchChange: (t: string) => void;
  selectedFilter: string; filteredCount: number; totalCount: number;
}) => {
  const filterLabel = selectedFilter === "all"
    ? "toutes les opérations"
    : OPERATION_CONFIG[selectedFilter as keyof typeof OPERATION_CONFIG]?.label?.toLowerCase() ?? "opérations";

  return (
    <View style={s.searchWrapper}>
      <View style={s.searchBox}>
        <Ionicons name="person-outline" size={18} color={THEME.colors.neutral[400]} />
        <TextInput
          style={s.searchInput}
          placeholder={`Rechercher un membre parmi les ${filterLabel}…`}
          value={searchText}
          onChangeText={onSearchChange}
          placeholderTextColor={THEME.colors.neutral[400]}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>
      {(searchText || selectedFilter !== "all") && (
        <Text style={s.searchCount}>
          {filteredCount} résultat{filteredCount !== 1 ? "s" : ""} sur {totalCount}
        </Text>
      )}
    </View>
  );
};

// ─── Card opération ───────────────────────────────────────────────────────────

const OperationCard = ({ item, onPress }: { item: TimelineItem; onPress: () => void }) => {
  const scale  = useRef(new Animated.Value(1)).current;
  const config = OPERATION_CONFIG[item.type];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={s.opCard}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <LinearGradient colors={config.gradient} style={s.opStripe} />
        <View style={s.opBody}>
          <LinearGradient colors={config.gradient} style={s.opIconCircle}>
            <Ionicons name={config.icon as any} size={20} color="white" />
          </LinearGradient>
          <View style={s.opContent}>
            <View style={s.opTopRow}>
              <Text style={s.opTypeLabel}>{config.label}</Text>
              <Text style={s.opDate}>{formatDateSmart(item.date)}</Text>
            </View>
            <Text style={[s.opAmount, { color: config.textColor }]}>{formatMoney(item.amount)}</Text>
            {item.memberName && (
              <View style={s.opMemberRow}>
                <Ionicons name="person-circle-outline" size={13} color={THEME.colors.neutral[400]} />
                <Text style={s.opMemberText}>
                  {item.memberName}{item.memberNumero ? `  ·  ${item.memberNumero}` : ""}
                </Text>
              </View>
            )}
            {item.status && (
              <View style={[s.opStatusBadge, { backgroundColor: config.lightBg }]}>
                <Text style={[s.opStatusText, { color: config.textColor }]}>{item.status}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.neutral[300]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Détail opération (modal) ─────────────────────────────────────────────────

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue}>{value}</Text>
  </View>
);

const OperationDetailModal = ({ item, onClose }: { item: TimelineItem | null; onClose: () => void }) => {
  if (!item) return null;
  const config = OPERATION_CONFIG[item.type];
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.modalSheet}>
          <LinearGradient colors={config.gradient} style={s.modalHeader}>
            <View style={s.modalHandle} />
            <View style={s.modalHeaderRow}>
              <Ionicons name={config.icon as any} size={28} color="white" />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={s.modalHeaderTitle}>{config.label}</Text>
                <Text style={s.modalHeaderSub}>
                  {formatDateSmart(item.date)}{item.date?.length > 10 ? `  ·  ${item.date.slice(11, 16)}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            <View style={s.modalAmountBox}>
              <Text style={s.modalAmountLabel}>Montant</Text>
              <Text style={s.modalAmountValue}>{formatMoney(item.amount)}</Text>
            </View>
          </LinearGradient>
          <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {item.memberName && (
              <DetailRow
                label="Membre"
                value={`${item.memberName}${item.memberNumero ? `  (${item.memberNumero})` : ""}`}
              />
            )}
            {item.type === "emprunt" && (<>
              <DetailRow label="Montant emprunté"   value={formatMoney(item.data.montant_emprunte)} />
              <DetailRow label="Total à rembourser" value={formatMoney(item.data.montant_total_a_rembourser)} />
              <DetailRow label="Statut"             value={item.data.statut || "En cours"} />
              <DetailRow label="Session"            value={item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"              value={item.data.notes || "Aucune note"} />
            </>)}
            {item.type === "remboursement" && (<>
              <DetailRow label="Capital remboursé" value={formatMoney(item.data.montant_capital)} />
              <DetailRow label="Intérêts"          value={formatMoney(item.data.montant_interet)} />
              <DetailRow label="Session"           value={item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"             value={item.data.notes || "Aucune note"} />
            </>)}
            {item.type === "solidarite" && (<>
              <DetailRow label="Montant" value={formatMoney(item.data.montant)} />
              <DetailRow label="Session" value={item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"   value={item.data.notes || "Aucune note"} />
            </>)}
            {item.type === "renflouement" && (<>
              <DetailRow label="Montant" value={formatMoney(item.data.montant)} />
              <DetailRow label="Cause"   value={item.data.cause || "N/A"} />
              <DetailRow label="Notes"   value={item.data.notes || "Aucune note"} />
            </>)}
            {item.type === "epargne" && (<>
              <DetailRow label="Montant"  value={formatMoney(item.data.montant)} />
              <DetailRow label="Type"     value={item.data.type_transaction_display || item.data.type || "Dépôt"} />
              <DetailRow label="Intérêts" value={formatMoney(item.data.montant_interet || 0)} />
              <DetailRow label="Session"  value={item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"    value={item.data.notes || "Aucune note"} />
            </>)}
            {item.type === "assistance" && (<>
              <DetailRow label="Montant"       value={formatMoney(item.data.montant)} />
              <DetailRow label="Type"          value={item.data.type_assistance || "N/A"} />
              <DetailRow label="Statut"        value={item.data.statut || "N/A"} />
              <DetailRow label="Justification" value={item.data.justification || "Aucune"} />
              <DetailRow label="Session"       value={item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"         value={item.data.notes || "Aucune note"} />
            </>)}
            {item.type === "paiement-inscription" && (<>
              <DetailRow label="Montant" value={formatMoney(item.data.montant)} />
              <DetailRow label="Session" value={item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"   value={item.data.notes || "Aucune note"} />
            </>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Utilitaires UI ──────────────────────────────────────────────────────────

const LoadingView = ({ message = "Chargement…" }: { message?: string }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: SPACING.lg }}>
    <LinearGradient colors={THEME.gradients.admin} style={{ borderRadius: 40, padding: 24 }}>
      <Ionicons name="analytics" size={44} color="white" />
    </LinearGradient>
    <Text style={{ color: THEME.colors.neutral[600], fontSize: FONT_SIZES.md, fontWeight: "600" }}>{message}</Text>
  </View>
);

const ErrorView = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.xl }}>
    <Ionicons name="alert-circle" size={60} color="#EF4444" />
    <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: "700", color: "#DC2626", marginTop: SPACING.md, textAlign: "center" }}>{message}</Text>
    <TouchableOpacity onPress={onRetry} style={{ marginTop: SPACING.lg }}>
      <LinearGradient colors={THEME.gradients.primary} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: 50, gap: SPACING.sm }}>
        <Ionicons name="refresh" size={18} color="white" />
        <Text style={{ color: "white", fontWeight: "700", fontSize: FONT_SIZES.md }}>Réessayer</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={{ alignItems: "center", paddingVertical: SPACING.xl * 2 }}>
    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.colors.neutral[100], alignItems: "center", justifyContent: "center", marginBottom: SPACING.md }}>
      <Ionicons name="document-text-outline" size={40} color={THEME.colors.neutral[300]} />
    </View>
    <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: "700", color: THEME.colors.neutral[600] }}>{title}</Text>
    <Text style={{ fontSize: FONT_SIZES.md, color: THEME.colors.neutral[400], textAlign: "center", marginTop: SPACING.xs, paddingHorizontal: SPACING.xl }}>{subtitle}</Text>
  </View>
);

const PaginationBar = ({ current, total, onPrev, onNext }: {
  current: number; total: number; onPrev: () => void; onNext: () => void;
}) => (
  <View style={s.pagination}>
    <TouchableOpacity style={[s.pageBtn, current === 1 && { opacity: 0.35 }]} onPress={onPrev} disabled={current === 1}>
      <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
    </TouchableOpacity>
    <View style={s.pageLabelBox}>
      <Text style={s.pageLabel}>Page {current} / {total}</Text>
    </View>
    <TouchableOpacity style={[s.pageBtn, current === total && { opacity: 0.35 }]} onPress={onNext} disabled={current === total}>
      <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  </View>
);

// ─── Vue sessions ─────────────────────────────────────────────────────────────
// Reçoit un sessionId optionnel pour auto-sélectionner la bonne session.
// On utilise un useEffect qui se re-déclenche à chaque fois que sessions change
// (chargement async) pour ne pas rater la sélection.

const SessionsView = ({
  exercice,
  onSelectSession,
}: {
  exercice: Exercise;
  onSelectSession: (s: Session) => void;
}) => {
  const { data: sessionsRaw, isLoading, error, refetch } = useSessions(exercice.id);
  const sessions: Session[] = arr(sessionsRaw).sort(
    (a: Session, b: Session) =>
      new Date(b.date_session || "").getTime() - new Date(a.date_session || "").getTime()
  );

  if (isLoading) return <LoadingView message="Chargement des sessions…" />;
  if (error)     return <ErrorView message="Impossible de charger les sessions" onRetry={refetch} />;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120, paddingTop: SPACING.md }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.sectionHeader}>
        <Ionicons name="folder-open" size={18} color={COLORS.primary} />
        <Text style={s.sectionTitle}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</Text>
      </View>
      {sessions.length === 0
        ? <EmptyState title="Aucune session" subtitle="Aucune session créée pour cet exercice" />
        : sessions.map((session) => (
            <SessionCard
              key={String(session.id)}
              session={session}
              onPress={() => onSelectSession(session)}
            />
          ))
      }
    </ScrollView>
  );
};

// ─── Vue opérations ───────────────────────────────────────────────────────────

const OperationsView = ({ session }: { session: Session }) => {
  const { data: loansRaw }               = useLoans({ session: session.id });
  const { data: repaymentsRaw }          = useRepayments({ session: session.id });
  const { data: solidarityRaw }          = useSolidarityPayments({ session: session.id });
  const { data: renflouementRaw }        = useRenflouements({ session: session.id });
  const { data: savingsRaw }             = useSavings({ session: session.id });
  const { data: assistancesRaw }         = useAssistances({ session: session.id });
  const { data: inscriptionPaymentsRaw } = useInscriptionPayments({ session: session.id });

  const [selectedItem,   setSelectedItem]   = useState<TimelineItem | null>(null);
  const [searchText,     setSearchText]     = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [page,           setPage]           = useState(1);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    arr(loansRaw).forEach((l: any) => items.push({ id: `loan-${l.id}`, type: "emprunt", date: l.date_emprunt, amount: parseFloat(l.montant_emprunte) || 0, data: l, status: l.statut, memberName: extractMemberName(l), memberNumero: extractMemberNumero(l) }));
    arr(repaymentsRaw).forEach((r: any) => items.push({ id: `rep-${r.id}`, type: "remboursement", date: r.date_remboursement, amount: parseFloat(r.montant) || 0, data: r, memberName: extractMemberName(r), memberNumero: extractMemberNumero(r) }));
    arr(solidarityRaw).forEach((s: any) => items.push({ id: `sol-${s.id}`, type: "solidarite", date: s.date_paiement, amount: parseFloat(s.montant) || 0, data: s, memberName: extractMemberName(s), memberNumero: extractMemberNumero(s) }));
    arr(renflouementRaw).forEach((renf: any) => {
      (renf.paiements_details || []).forEach((pay: any) => items.push({ id: `renf-${pay.id}`, type: "renflouement", date: pay.date_paiement, amount: parseFloat(pay.montant) || 0, data: { ...pay, cause: renf.cause }, memberName: extractMemberName(pay), memberNumero: extractMemberNumero(pay) }));
    });
    arr(savingsRaw).forEach((sv: any) => items.push({ id: `sav-${sv.id}`, type: "epargne", date: sv.date_transaction || sv.date_creation, amount: parseFloat(sv.montant) || 0, data: sv, status: sv.type_transaction_display || sv.type, memberName: extractMemberName(sv), memberNumero: extractMemberNumero(sv) }));
    arr(assistancesRaw).forEach((a: any) => items.push({ id: `ast-${a.id}`, type: "assistance", date: a.date_paiement || a.date_demande, amount: parseFloat(a.montant) || 0, data: a, status: a.statut, memberName: extractMemberName(a), memberNumero: extractMemberNumero(a) }));
    arr(inscriptionPaymentsRaw).forEach((p: any) => items.push({ id: `ins-${p.id}`, type: "paiement-inscription", date: p.date_paiement, amount: parseFloat(p.montant) || 0, data: p, memberName: extractMemberName(p), memberNumero: extractMemberNumero(p) }));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loansRaw, repaymentsRaw, solidarityRaw, renflouementRaw, savingsRaw, assistancesRaw, inscriptionPaymentsRaw]);

  const filteredTimeline = useMemo(() => {
    let f = timeline;
    if (selectedFilter !== "all") f = f.filter((i) => i.type === selectedFilter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      f = f.filter((i) =>
        (i.memberName   || "").toLowerCase().includes(q) ||
        (i.memberNumero || "").toLowerCase().includes(q)
      );
    }
    return f;
  }, [timeline, selectedFilter, searchText]);

  useMemo(() => setPage(1), [searchText, selectedFilter]);

  const totalPages    = Math.max(1, Math.ceil(filteredTimeline.length / OPS_PER_PAGE));
  const pagedTimeline = filteredTimeline.slice((page - 1) * OPS_PER_PAGE, page * OPS_PER_PAGE);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    timeline.forEach((i) => { t[i.type] = (t[i.type] || 0) + i.amount; });
    return t;
  }, [timeline]);

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: SPACING.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
          <View style={s.sectionHeader}>
            <Ionicons name="stats-chart" size={18} color={THEME.colors.admin[500]} />
            <Text style={s.sectionTitle}>Bilan de la session</Text>
          </View>
          <SessionSummaryGrid totals={totals} />
        </View>

        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm }}>
          <FilterChips selected={selectedFilter} onChange={setSelectedFilter} />
        </View>

        <View style={{ paddingHorizontal: SPACING.lg }}>
          <MemberSearchBar
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedFilter={selectedFilter}
            filteredCount={filteredTimeline.length}
            totalCount={timeline.length}
          />
        </View>

        <View style={{ paddingHorizontal: SPACING.lg }}>
          {filteredTimeline.length === 0 ? (
            <EmptyState
              title={searchText ? `Aucun résultat pour "${searchText}"` : "Aucune opération"}
              subtitle={searchText
                ? "Vérifiez le nom ou le numéro du membre"
                : "Aucune transaction enregistrée pour cette session"}
            />
          ) : (
            <>
              <FlatList
                data={pagedTimeline}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <OperationCard item={item} onPress={() => setSelectedItem(item)} />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
              />
              {totalPages > 1 && (
                <PaginationBar
                  current={page} total={totalPages}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      <OperationDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
};

// ─── Composant principal ────────────────────────────────────────────────

export default function AdminHistoryScreen() {
  const insets = useSafeAreaInsets();
  const route  = useRoute<any>();

  // ── Chargement des exercices ──
  const { data: exercicesRaw, isLoading, error, refetch } = useExercises();
  const exercices: Exercise[] = arr(exercicesRaw).sort(
    (a: Exercise, b: Exercise) =>
      new Date(b.date_debut || "").getTime() - new Date(a.date_debut || "").getTime()
  );

  // ── Navigation manuelle (quand l'utilisateur navigue lui-même dans l'écran) ──
  const [manualExercice, setManualExercice] = useState<Exercise | null>(null);
  const [manualSession,  setManualSession]  = useState<Session  | null>(null);
  const [exPage, setExPage] = useState(1);

  // ── Paramètres de route (quand on vient du Dashboard) ──
  // On lit les params directement depuis route.params à chaque rendu.
  // IMPORTANT : on ne les met PAS dans un useState pour éviter les problèmes
  // de synchronisation. On lit juste ce qui est là maintenant.
  const routeParams   = route.params as RouteParams | undefined;
  // Les IDs sont des UUID (strings) — on les garde tels quels
  const paramSessionId    = routeParams?.sessionId   || null;   // string UUID ou null
  const paramExerciceId   = routeParams?.exerciceId  || null;   // string UUID ou null
  const paramSessionName  = routeParams?.sessionName  ?? null;
  const paramExerciceName = routeParams?.exerciceName ?? null;

  // ── Décision d'affichage ──
  // Règle : si des params valides sont présents dans la route, ils ont la priorité
  // sur la navigation manuelle. Sinon, on utilise l'état manuel.
  const hasRouteParams = paramSessionId != null && paramSessionName != null;

  // Session et exercice actifs : soit depuis les params, soit depuis la navigation manuelle
  const activeSession: Session | null = hasRouteParams
    ? ({ id: paramSessionId, nom: paramSessionName } as unknown as Session)
    : manualSession;

  // Pour l'exercice : si on a les params, on cherche l'objet complet dans la liste
  // (pour avoir toutes les infos), sinon on utilise l'objet manuel
  const activeExercice: Exercise | null = hasRouteParams
    ? (exercices.find((ex) => String(ex.id) === paramExerciceId)
        ?? ({ id: paramExerciceId ?? "", nom: paramExerciceName ?? "Exercice" } as unknown as Exercise))
    : manualExercice;

  const showDashboard = !!activeExercice && !activeSession;

  const totalExPages   = Math.max(1, Math.ceil(exercices.length / EXERCISES_PER_PAGE));
  const pagedExercices = exercices.slice((exPage - 1) * EXERCISES_PER_PAGE, exPage * EXERCISES_PER_PAGE);

  // Loader uniquement si on est en navigation manuelle sans rien de sélectionné
  if (!hasRouteParams && !activeExercice && !activeSession && isLoading)
    return <LoadingView message="Chargement des exercices…" />;
  if (!hasRouteParams && !activeExercice && !activeSession && error)
    return <ErrorView message="Impossible de charger les exercices" onRetry={refetch} />;

  // ── Retour arrière ──
  // Si on est en mode "params" (venu du Dashboard), le bouton retour
  // doit effacer les params de la route pour revenir à l'état neutre.
  // On le fait en appellant navigation.setParams({}) puis en remettant
  // l'état manuel à null également.
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (hasRouteParams) {
      // On est en mode "params" : vider les params et revenir à la liste des exercices
      navigation.setParams({
        sessionId: undefined,
        exerciceId: undefined,
        sessionName: undefined,
        exerciceName: undefined,
      });
    } else if (activeSession) {
      setManualSession(null);
    } else if (activeExercice) {
      setManualExercice(null);
    }
  };

  const handleReset = () => {
    navigation.setParams({
      sessionId: undefined,
      exerciceId: undefined,
      sessionName: undefined,
      exerciceName: undefined,
    });
    setManualSession(null);
    setManualExercice(null);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient colors={THEME.gradients.dark} style={s.header}>
        <View style={s.headerRow}>
          {(activeExercice || activeSession) && (
            <TouchableOpacity style={s.backBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {activeSession
                ? activeSession.nom
                : activeExercice
                  ? activeExercice.nom
                  : "Historique"}
            </Text>
            <Text style={s.headerSub}>
              {activeSession
                ? `Exercice  ·  ${activeExercice?.nom ?? ""}`
                : activeExercice
                  ? "Sélectionnez une session"
                  : "Tous les exercices"}
            </Text>
          </View>
          <View style={s.adminPill}>
            <Ionicons name="shield-checkmark" size={12} color="white" />
            <Text style={s.adminPillText}>Admin</Text>
          </View>
        </View>

        <Breadcrumb
          exercice={activeExercice}
          session={activeSession}
          onReset={handleReset}
          onBackToExercice={() => {
            if (hasRouteParams) {
              navigation.setParams({
                sessionId: undefined,
                exerciceId: undefined,
                sessionName: undefined,
                exerciceName: undefined,
              });
            } else {
              setManualSession(null);
            }
          }}
        />

        {showDashboard && <ExerciseDashboard exercice={activeExercice!} />}
      </LinearGradient>

      {/* ── Vue 1 : liste des exercices ── */}
      {!activeExercice && !activeSession && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120, paddingTop: SPACING.lg }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={THEME.colors.admin[500]} />
            <Text style={s.sectionTitle}>{exercices.length} exercice{exercices.length !== 1 ? "s" : ""}</Text>
          </View>
          {exercices.length === 0
            ? <EmptyState title="Aucun exercice" subtitle="Aucun exercice n'a encore été créé" />
            : <>
                {pagedExercices.map((ex) => (
                  <ExerciceCard
                    key={String(ex.id)} exercice={ex}
                    onPress={() => { setManualExercice(ex); setExPage(1); }}
                  />
                ))}
                {totalExPages > 1 && (
                  <PaginationBar
                    current={exPage} total={totalExPages}
                    onPrev={() => setExPage((p) => Math.max(1, p - 1))}
                    onNext={() => setExPage((p) => Math.min(totalExPages, p + 1))}
                  />
                )}
              </>
          }
        </ScrollView>
      )}

      {/* ── Vue 2 : sessions de l'exercice ── */}
      {activeExercice && !activeSession && (
        <SessionsView
          exercice={activeExercice}
          onSelectSession={(sess) => setManualSession(sess)}
        />
      )}

      {/* ── Vue 3 : transactions de la session ──
           key= force le remontage complet quand la session change,
           garantissant que tous les hooks re-fetchent avec le bon ID. */}
      {activeExercice && activeSession && (
        <OperationsView key={`ops-${activeSession.id}`} session={activeSession} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },

  header:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginRight: SPACING.sm },
  headerTitle:{ fontSize: FONT_SIZES.xl, fontWeight: "800", color: "white" },
  headerSub:  { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  adminPill:  { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: 20, gap: 4 },
  adminPillText: { fontSize: 11, color: "white", fontWeight: "700" },

  breadcrumb: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: SPACING.sm },
  crumb:      { fontSize: 12 },
  crumbLink:  { color: "rgba(255,255,255,0.6)", fontWeight: "500" },
  crumbActive:{ color: "white", fontWeight: "700" },

  dashGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.sm },
  dashTile: { width: "47%", borderRadius: 16, padding: SPACING.md, gap: 4 },
  dashTileValue: { fontSize: FONT_SIZES.md, fontWeight: "800", color: "white", marginTop: 4 },
  dashTileLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
  sectionTitle:  { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[700] },

  exerciceCard: { marginBottom: SPACING.md, borderRadius: 20, overflow: "hidden", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
  exerciceCardGradient: { flexDirection: "row", alignItems: "center", padding: SPACING.md + 4 },
  exerciceIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  exerciceTextBlock: { flex: 1 },
  exerciceNom:   { fontSize: FONT_SIZES.lg, fontWeight: "800", color: "white" },
  exerciceDates: { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  exerciceStatusBadge: { marginTop: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: 20 },
  exerciceStatusText: { fontSize: 11, color: "white", fontWeight: "700" },
  exerciceArrow: { paddingLeft: SPACING.sm },

  sessionCard: { marginBottom: SPACING.md, borderRadius: 18, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 5 },
  sessionCardGradient: { flexDirection: "row", alignItems: "center", padding: SPACING.md },
  sessionIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  sessionTextBlock: { flex: 1 },
  sessionNom:   { fontSize: FONT_SIZES.md, fontWeight: "700", color: "white" },
  sessionDate:  { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  sessionStatusBadge: { marginTop: 5, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 20 },
  sessionStatusText: { fontSize: 11, color: "white", fontWeight: "700" },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  summaryTile: { width: "30%", flexGrow: 1, borderRadius: 14, padding: SPACING.sm + 2, alignItems: "center", gap: 3, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  summaryTileLabel: { fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: "600", textAlign: "center" },
  summaryTileValue: { fontSize: FONT_SIZES.xs, fontWeight: "800", color: "white", textAlign: "center" },

  filterScroll: { marginBottom: SPACING.sm },
  filterRow:    { flexDirection: "row", paddingHorizontal: 2 },
  filterChip:   { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 20, paddingHorizontal: SPACING.md, paddingVertical: 7, marginHorizontal: 3, gap: 4, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: "600", color: THEME.colors.neutral[600] },

  searchWrapper: { marginBottom: SPACING.md },
  searchBox:     { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: SPACING.md, paddingVertical: 10, gap: SPACING.sm, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  searchInput:   { flex: 1, fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[800] },
  searchCount:   { fontSize: 11, color: THEME.colors.neutral[500], textAlign: "center", marginTop: 5 },

  opCard:   { backgroundColor: "white", borderRadius: 16, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  opStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
  opBody:   { flexDirection: "row", alignItems: "center", padding: SPACING.md, paddingLeft: SPACING.md + 5 },
  opIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  opContent:  { flex: 1 },
  opTopRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  opTypeLabel:{ fontSize: FONT_SIZES.sm, fontWeight: "700", color: THEME.colors.neutral[800] },
  opDate:     { fontSize: 10, color: THEME.colors.neutral[400] },
  opAmount:   { fontSize: FONT_SIZES.md, fontWeight: "800", marginBottom: 3 },
  opMemberRow:{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  opMemberText:{ fontSize: 11, color: THEME.colors.neutral[500] },
  opStatusBadge:{ alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  opStatusText: { fontSize: 10, fontWeight: "700" },

  pagination:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.lg, marginVertical: SPACING.lg },
  pageBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: "white", alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  pageLabelBox: { backgroundColor: "white", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20, elevation: 1 },
  pageLabel:    { fontSize: FONT_SIZES.sm, fontWeight: "700", color: THEME.colors.neutral[700] },

  modalBackdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet:      { maxHeight: SCREEN_HEIGHT * 0.85, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", backgroundColor: "white" },
  modalHeader:     { padding: SPACING.lg, paddingTop: SPACING.md },
  modalHandle:     { width: 40, height: 4, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 2, alignSelf: "center", marginBottom: SPACING.md },
  modalHeaderRow:  { flexDirection: "row", alignItems: "center", marginBottom: SPACING.lg },
  modalHeaderTitle:{ fontSize: FONT_SIZES.xl, fontWeight: "800", color: "white" },
  modalHeaderSub:  { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  modalAmountBox:  { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, padding: SPACING.md, alignItems: "center" },
  modalAmountLabel:{ fontSize: FONT_SIZES.sm, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  modalAmountValue:{ fontSize: FONT_SIZES.xxl, fontWeight: "800", color: "white" },
  modalBody:       { paddingHorizontal: SPACING.lg, backgroundColor: "white" },
  detailRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailLabel:     { fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[500], fontWeight: "500", flex: 1 },
  detailValue:     { fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[800], fontWeight: "700", textAlign: "right", flex: 1.5, marginLeft: SPACING.md },
});