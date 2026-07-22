import React, { useState, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Animated, Dimensions, StatusBar, Modal, TextInput, Alert,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useLoans, useRepayments } from "../../hooks/useLoan";
import { useSolidarityPayments } from "../../hooks/useSolidarity";
import { useRenflouementPayments } from "../../hooks/useRenflouement";
import { useSavings } from "../../hooks/useSaving";
import { useAssistances } from "../../hooks/useAssistance";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExercises } from "../../hooks/useExercise";
import { useSessions } from "../../hooks/useSession";
import { useMembers } from "../../hooks/useMember";
import { useSessionDepenses } from "../../hooks/useSessionDepenses";
import { useHistoryExport, ExportData, ExportSession, ExportOperation } from "../../hooks/useHistoryExport";
import { Exercise } from "../../types/exercise.types";
import { Session } from "../../types/session.types";
import { useRetraitsEpargne } from "../../hooks/useRetraitEpargne";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const EXERCISES_PER_PAGE = 6;
const OPS_PER_PAGE = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineItem = {
  id: string;
  type: "emprunt" | "remboursement" | "solidarite" | "renflouement"
      | "epargne" | "assistance" | "paiement-inscription" | "retrait-epargne"; // ← ajouter
  date: string;
  amount: number;
  data: any;
  status?: string;
  memberName?: string;
  memberNumero?: string;
};

// ─── Design system aligné sur l'app existante ────────────────────────────────
// Couleurs reprisent des cartes visibles dans les screenshots :
// Membres=bleu, Solidarité=vert, Épargne=rose/violet, Emprunts=orange, etc.

const THEME = {
  colors: {
    primary: { 50: "#EFF6FF", 500: COLORS.primary, 600: "#2563EB" },
    success: { 50: "#ECFDF5", 500: "#10B981", 600: "#059669" },
    warning: { 50: "#FFF7ED", 500: "#F97316", 600: "#EA580C" },  // orange comme "Emprunts"
    error:   { 50: "#FEF2F2", 500: "#EF4444", 600: "#DC2626" },
    neutral: { 100: "#F5F5F5", 200: "#E5E5E5", 300: "#D4D4D4",
               400: "#A3A3A3", 500: "#737373", 600: "#525252",
               700: "#404040", 800: "#262626" },
    admin:   { 50: "#F0FDF4", 500: "#22C55E", 600: "#16A34A" },
  },
  gradients: {
    // Gradients pleins (comme dans les cartes de l'app)
    primary:   ["#3B82F6", "#2563EB"]   as [string, string],
    admin:     ["#22C55E", "#16A34A"]   as [string, string],
    teal:      ["#14B8A6", "#0D9488"]   as [string, string],  // Solidarité (vert teal)
    pink:      ["#EC4899", "#BE185D"]   as [string, string],  // Épargne
    orange:    ["#F97316", "#EA580C"]   as [string, string],  // Emprunts
    purple:    ["#A855F7", "#7C3AED"]   as [string, string],  // Assistances
    green:     ["#10B981", "#059669"]   as [string, string],  // Remboursements
    red:       ["#EF4444", "#DC2626"]   as [string, string],  // Renflouements
    cyan:      ["#06B6D4", "#0891B2"]   as [string, string],  // Inscription
    dark:      ["#334155", "#1E293B"]   as [string, string],  // Header
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
  "retrait-epargne": {
    label: "Retrait d'épargne",
    icon: "arrow-up-circle",
    gradient: ["#F43F5E", "#BE123C"] as [string, string],
    lightBg: "#FFF1F2",
    textColor: "#BE123C",
  },
} as const;

// ─── Utilitaires ─────────────────────────────────────────────────────────────

// Format : 100 000 000 FCFA (espace comme séparateur, pas de virgule)
const formatMoney = (val: number | string | undefined): string => {
  if (typeof val === "string") val = parseFloat(val);
  if (typeof val !== "number" || isNaN(val)) return "0 FCFA";
  // Utilise les espaces insécables comme séparateurs de milliers
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

const appendRenflouementPaymentsToTimeline = (
  items: TimelineItem[],
  paymentsRaw: any,
  sessionId?: string | number | null
) => {
  arr(paymentsRaw)
    .filter((pay: any) => !sessionId || String(pay.session) === String(sessionId))
    .forEach((pay: any) => {
      items.push({
        id: `renf-pay-${pay.id}`,
        type: "renflouement",
        date: pay.date_paiement,
        amount: parseFloat(pay.montant) || 0,
        data: {
          ...pay,
          montant_du: pay.renflouement_info?.montant_du,
          montant_paye: pay.montant,
          montant_restant: pay.renflouement_info?.montant_restant,
          cause: pay.notes || pay.renflouement_info?.type_cause,
          session_nom: pay.session_info?.nom,
          is_solde: (pay.renflouement_info?.montant_restant ?? 0) <= 0,
          pourcentage_paye: pay.renflouement_info?.montant_du
            ? Math.round(
                ((pay.renflouement_info?.montant_paye ?? (parseFloat(pay.montant) || 0)) /
                  pay.renflouement_info.montant_du) *
                  100
              )
            : 100,
        },
        memberName: pay.membre_nom || extractMemberName(pay),
        memberNumero: pay.membre_numero || extractMemberNumero(pay),
      });
    });
};

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

  const totalEmprunts = useMemo(() => arr(loansRaw).reduce((s: number, l: any) => s + (parseFloat(l.montant_emprunte) || 0), 0), [loansRaw]);
  const totalEpargne  = useMemo(() => arr(savingsRaw).reduce((s: number, e: any) => s + (parseFloat(e.montant) || 0), 0), [savingsRaw]);
  // ✅ Filtrer les membres par exercice via exercice_inscription
  const nombreMembres = useMemo(() =>
    arr(membersRaw).filter((m: any) => String(m.exercice_inscription) === String(exercice.id)).length,
  [membersRaw, exercice.id]);
  const fondsSocial   = (exercice as any)?.fonds_social_info?.montant_total ?? 0;

  const rows = [
    { label: "Fonds social",   value: formatMoney(fondsSocial),   dotColor: THEME.gradients.teal[0]    },
    { label: "Total emprunts", value: formatMoney(totalEmprunts),  dotColor: THEME.gradients.orange[0]  },
    { label: "Total epargnes", value: formatMoney(totalEpargne),   dotColor: THEME.gradients.pink[0]    },
    { label: "Membres",        value: String(nombreMembres),       dotColor: THEME.gradients.primary[0] },
  ];

  return (
    <View style={s.dashCard}>
      {/* En-tete colonnes */}
      <View style={s.dashTableHeader}>
        <Text style={s.dashHeaderCell}>Indicateur</Text>
        <Text style={[s.dashHeaderCell, { textAlign: "right" }]}>Valeur</Text>
      </View>
      {rows.map((row, index) => {
        const isZero = row.value === "0 FCFA" || row.value === "0";
        return (
          <View key={index} style={[s.dashTableRow, index === 0 && { borderTopWidth: 0 }]}>
            <View style={s.dashRowLeft}>
              <View style={[s.dashDot, { backgroundColor: row.dotColor }]} />
              <Text style={s.dashRowLabel}>{row.label}</Text>
            </View>
            <Text style={[s.dashRowValue, isZero && s.dashRowValueZero, !isZero && { color: row.dotColor }]}>
              {row.value}
            </Text>
          </View>
        );
      })}
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
          {/* Icône */}
          <View style={s.exerciceIconCircle}>
            <Ionicons name="calendar" size={28} color="white" />
          </View>

          {/* Texte */}
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

          {/* Flèche */}
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

// ─── Synthèse session — Tableau Option A ────────────────────────────────────

const SessionSummaryGrid = ({
  totals,
  collation,
  autreDepense,
  motifDepense,
}: {
  totals: Record<string, number>;
  collation?: number;
  autreDepense?: number;
  motifDepense?: string;
}) => {
  const hasDepense = (autreDepense ?? 0) > 0;
  return (
    <View style={s.summaryCard}>
      <View style={s.summaryTableHeader}>
        <Text style={s.summaryHeaderCell}>Categorie</Text>
        <Text style={[s.summaryHeaderCell, { textAlign: "right" }]}>Montant</Text>
      </View>

      {Object.entries(OPERATION_CONFIG).map(([type, cfg], index) => {
        const total    = totals[type] ?? 0;
        const isZero   = total === 0;
        const dotColor = cfg.gradient[0];
        return (
          <View key={type} style={[s.summaryTableRow, index === 0 && { borderTopWidth: 0 }]}>
            <View style={s.summaryRowLeft}>
              <View style={[s.summaryDot, { backgroundColor: dotColor }]} />
              <Text style={s.summaryRowLabel}>{cfg.label}</Text>
            </View>
            <Text style={[s.summaryRowAmount, isZero ? s.summaryRowAmountZero : { color: dotColor }]}>
              {formatMoney(total)}
            </Text>
          </View>
        );
      })}

      {/* Separateur depenses de session */}
      <View style={s.summaryDepSep}>
        <View style={s.summaryDepSepLine} />
        <Text style={s.summaryDepSepText}>Depenses de session</Text>
        <View style={s.summaryDepSepLine} />
      </View>

      {/* Collation */}
      <View style={s.summaryTableRow}>
        <View style={s.summaryRowLeft}>
          <View style={[s.summaryDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={s.summaryRowLabel}>Collation (agape)</Text>
        </View>
        <Text style={[s.summaryRowAmount, (collation ?? 0) === 0 ? s.summaryRowAmountZero : { color: "#D97706" }]}>
          {formatMoney(collation ?? 0)}
        </Text>
      </View>

      {/* Depense supplementaire */}
      <View style={s.summaryTableRow}>
        <View style={s.summaryRowLeft}>
          <View style={[s.summaryDot, { backgroundColor: "#EF4444" }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.summaryRowLabel}>Depense supplementaire</Text>
            {hasDepense && !!motifDepense && (
              <Text style={s.summaryDepMotif} numberOfLines={1}>{motifDepense}</Text>
            )}
          </View>
        </View>
        <Text style={[s.summaryRowAmount, !hasDepense ? s.summaryRowAmountZero : { color: "#DC2626" }]}>
          {formatMoney(autreDepense ?? 0)}
        </Text>
      </View>
    </View>
  );
};

// ─── Options de tri ────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "date-desc",  label: "Date ↓",     icon: "calendar-outline"  },
  { key: "member-asc", label: "Membre A→Z", icon: "people-outline"    },
  { key: "operation",  label: "Opération",   icon: "list-outline"      },
] as const;

const SortChips = ({ selected, onChange }: { selected: string; onChange: (k: string) => void }) => (
  <View style={s.sortRow}>
    <Ionicons name="swap-vertical" size={14} color={THEME.colors.neutral[400]} />
    {SORT_OPTIONS.map((opt) => {
      const active = selected === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[s.sortChip, active && s.sortChipActive]}
          onPress={() => onChange(opt.key)}
        >
          <Ionicons name={opt.icon as any} size={12} color={active ? "white" : THEME.colors.neutral[500]} />
          <Text style={[s.sortChipText, active && { color: "white" }]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Modal de sélection du format d'export ──────────────────────────────────

const FormatSelectionModal = ({ visible, exportData, sessionExport, onClose, isExercice }: {
  visible: boolean;
  exportData: ExportData;
  sessionExport?: ExportSession;
  onClose: () => void;
  isExercice?: boolean;
}) => {
  const { exportExcel, exportPdf } = useHistoryExport();
  const label = sessionExport ? sessionExport.nom : exportData.exerciceNom;
  const count = sessionExport
    ? sessionExport.operations.length
    : exportData.sessions.reduce((s, x) => s + x.operations.length, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.typeModalContainer}>
          <View style={s.typeModalHeader}>
            <Ionicons name="download-outline" size={22} color={COLORS.primary} />
            <Text style={s.typeModalTitle}>Exporter</Text>
          </View>
          <Text style={s.typeModalSub}>
            {label} · {count} opération{count > 1 ? "s" : ""}{isExercice ? " (toutes sessions)" : ""}
          </Text>
          <View style={s.formatModalList}>
            <TouchableOpacity
              style={s.formatModalItem}
              onPress={() => { onClose(); exportExcel(exportData, sessionExport); }}
              activeOpacity={0.7}
            >
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={s.formatModalIcon}>
                <Ionicons name="grid-outline" size={22} color="white" />
              </LinearGradient>
              <View style={s.formatModalTextBlock}>
                <Text style={s.formatModalItemText}>Excel (.xls)</Text>
                <Text style={s.formatModalItemSub}>Tableau avec mise en forme complète</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.formatModalItem}
              onPress={() => { onClose(); exportPdf(exportData, sessionExport); }}
              activeOpacity={0.7}
            >
              <LinearGradient colors={["#EF4444", "#DC2626"]} style={s.formatModalIcon}>
                <Ionicons name="document-outline" size={22} color="white" />
              </LinearGradient>
              <View style={s.formatModalTextBlock}>
                <Text style={s.formatModalItemText}>PDF</Text>
                <Text style={s.formatModalItemSub}>Document portable, idéal pour impression</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.typeModalCancel} onPress={onClose}>
            <Text style={s.typeModalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Modal de sélection du type d'opération ──────────────────────────────────

const TypeSelectionModal = ({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
}) => {
  const types = [
    { key: "emprunt",              label: "Emprunts",             icon: "trending-up"       },
    { key: "remboursement",        label: "Remboursements",       icon: "arrow-down-circle" },
    { key: "solidarite",           label: "Solidarité",           icon: "people"            },
    { key: "renflouement",         label: "Renflouements",        icon: "refresh-circle"    },
    { key: "epargne",              label: "Épargnes",             icon: "wallet"            },
    { key: "assistance",           label: "Assistances",          icon: "heart"             },
    { key: "paiement-inscription", label: "Inscriptions",         icon: "school"            },
    { key: "retrait-epargne",      label: "Retraits d'épargne",   icon: "arrow-up-circle"   },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.typeModalContainer}>
          <View style={s.typeModalHeader}>
            <Ionicons name="filter" size={22} color={COLORS.primary} />
            <Text style={s.typeModalTitle}>Choisissez le type</Text>
          </View>
          <Text style={s.typeModalSub}>
            Le rapport inclura uniquement les opérations du type sélectionné (tri alphabétique par membre)
          </Text>
          <ScrollView style={s.typeModalList} showsVerticalScrollIndicator={false}>
            {types.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={s.typeModalItem}
                onPress={() => { onSelect(t.key); onClose(); }}
                activeOpacity={0.7}
              >
                <LinearGradient colors={["#3B82F6", "#2563EB"]} style={s.typeModalIcon}>
                  <Ionicons name={t.icon as any} size={18} color="white" />
                </LinearGradient>
                <Text style={s.typeModalItemText}>{t.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.typeModalCancel} onPress={onClose}>
            <Text style={s.typeModalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
    //{key: "Retrait épargne", label: "Retraits", icon: "arrow-up-circle" },
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
        {/* Bande colorée gauche */}
        <LinearGradient colors={config.gradient} style={s.opStripe} />

        <View style={s.opBody}>
          {/* Icône ronde */}
          <LinearGradient colors={config.gradient} style={s.opIconCircle}>
            <Ionicons name={config.icon as any} size={20} color="white" />
          </LinearGradient>

          {/* Contenu */}
          <View style={s.opContent}>
            <View style={s.opTopRow}>
              {item.amount < 0 && item.status === "Retrait épargne" ? (
                <Text style={s.opTypeLabel}>Retrait </Text>
              ) : (
                <Text style={s.opTypeLabel}>{config.label} </Text>
              )}
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

const OperationDetailModal = ({ item, onClose, children }: { item: TimelineItem | null; onClose: () => void; children?: React.ReactNode }) => {
  if (!item) return null;
  const config = OPERATION_CONFIG[item.type];
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.modalSheet}>
          {/* Header coloré */}
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
            {/* Montant dans le header */}
            <View style={s.modalAmountBox}>
              <Text style={s.modalAmountLabel}>Montant</Text>
              <Text style={s.modalAmountValue}>{formatMoney(item.amount)}</Text>
            </View>
          </LinearGradient>

          {/* Corps */}
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
              <DetailRow label="Montant payé"    value={formatMoney(item.data.montant ?? item.data.montant_paye)} />
              <DetailRow label="Renflouement dû" value={formatMoney(item.data.renflouement_info?.montant_du ?? item.data.montant_du ?? 0)} />
              <DetailRow label="Restant"         value={formatMoney(item.data.renflouement_info?.montant_restant ?? item.data.montant_restant ?? 0)} />
              <DetailRow label="Session"         value={item.data.session_info?.nom || item.data.session_nom || "N/A"} />
              <DetailRow label="Notes"           value={item.data.notes || "Aucune note"} />
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
            {children}
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

// ─── Bouton export ───────────────────────────────────────────────────────────

const ExportButton = ({ onPress, label = "Exporter" }: { onPress: () => void; label?: string }) => (
  <TouchableOpacity
    style={s.exportBtn}
    onPress={onPress}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    activeOpacity={0.8}
  >
    <Ionicons name="download" size={16} color="#fff" />
    <Text style={s.exportBtnText}>{label}</Text>
  </TouchableOpacity>
);

// ─── Vue sessions ─────────────────────────────────────────────────────────────

const SessionsView = ({ exercice, onSelectSession, onExportExercice }: {
  exercice: Exercise;
  onSelectSession: (s: Session) => void;
  onExportExercice: (sessions: Session[]) => void;
}) => {
  const { data: sessionsRaw, isLoading, error, refetch } = useSessions({ exercice: exercice.id });
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
        {sessions.length > 0 && (
          <ExportButton
            onPress={() => {
              onExportExercice(sessions);
            }}
          />
        )}
      </View>
      {sessions.length === 0
        ? <EmptyState title="Aucune session" subtitle="Aucune session créée pour cet exercice" />
        : sessions.map((session) => (
            <SessionCard key={String(session.id)} session={session} onPress={() => onSelectSession(session)} />
          ))
      }
    </ScrollView>
  );
};

// ─── Vue opérations ───────────────────────────────────────────────────────────

const OperationsView = ({ session, initialFilters }: { session: Session; initialFilters?: string[] }) => {
  const { data: loansRaw }        = useLoans({ session: session.id });
  const { data: repaymentsRaw }   = useRepayments({ session: session.id });
  const { data: solidarityRaw }   = useSolidarityPayments({ session: session.id });
  const { data: renflouementPaymentsRaw } = useRenflouementPayments({ session: session.id });
  const { data: savingsRaw }      = useSavings({ session: session.id });
  const { data: assistancesRaw }  = useAssistances({ session: session.id });
  const { data: depensesRaw }     = useSessionDepenses(session.id);
  const collation    = parseFloat(depensesRaw?.depenses?.[0]?.montant_collation     ?? "0") || 0;
  const autreDepense = parseFloat(depensesRaw?.depenses?.[0]?.montant_autre_depense ?? "0") || 0;
  const motifDepense = depensesRaw?.depenses?.[0]?.motif_autre_depense ?? "";
  // Ajouter avec les autres hooks de données
  const { data: retraitsEpargneRaw } = useRetraitsEpargne({ session: session.id });
  // Inscriptions : reconstruites depuis les membres (pas d'endpoint dédié)
  const { data: membersRaw }      = useMembers();

  const [selectedItem,   setSelectedItem]   = useState<TimelineItem | null>(null);
  const [searchText,     setSearchText]     = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState<string>("date-desc");
  const [page,           setPage]           = useState(1);

  const { exporting } = useHistoryExport();
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [formatModalVisible, setFormatModalVisible] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ data: ExportData; session: ExportSession } | null>(null);

  // Construit les données d'export pour cette session (tri + filtre paramétrables)
  const buildSessionExport = (sortKey?: string, typeFilter?: string): ExportSession => {
    let ops = [...timeline];
    // Filtre par type si spécifié
    if (typeFilter && typeFilter !== "all") {
      ops = ops.filter(i => i.type === typeFilter);
    }
    // Tri
    switch (sortKey || sortBy) {
      case "member-asc":
        ops.sort((a, b) => (a.memberName || "").localeCompare(b.memberName || ""));
        break;
      case "operation":
        ops.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "date-desc":
      default:
        ops.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    const filterLabel = typeFilter && typeFilter !== "all"
      ? (OPERATION_CONFIG[typeFilter as keyof typeof OPERATION_CONFIG]?.label ?? typeFilter)
      : undefined;
    return {
      id:           String(session.id),
      nom:          session.nom || "Session",
      date:         (session as any).date_session || "",
      collation,
      autreDepense,
      motifDepense,
      totals,
      filterLabel,
      operations:   ops.map((i) => ({
        type:         i.type,
        typeLabel:    OPERATION_CONFIG[i.type]?.label ?? i.type,
        memberName:   i.memberName || "",
        memberNumero: i.memberNumero || "",
        amount:       i.amount,
        date:         i.date,
      })),
    };
  };

  const proceedToExport = (sortKey: string, typeFilter?: string) => {
    const sessionExport = buildSessionExport(sortKey, typeFilter);
    const exportData: ExportData = {
      exerciceNom:  (session as any).exercice_nom || "Exercice",
      exerciceDate: "",
      sessions:     [sessionExport],
    };
    setPendingExport({ data: exportData, session: sessionExport });
    setFormatModalVisible(true);
  };

  const showTypeSelection = () => {
    setTypeModalVisible(true);
  };

  const handleExportSession = () => {
    Alert.alert(
      "Ordre de tri",
      "Choisissez l'ordre des opérations pour l'export :",
      [
        { text: "👤 Membre A→Z (recommandé)", onPress: () => proceedToExport("member-asc") },
        { text: "📅 Date ↓ (récent → ancien)", onPress: () => proceedToExport("date-desc") },
        { text: "📁 Par type d'opération",     onPress: showTypeSelection },
        { text: "Annuler",                     style: "cancel" },
      ]
    );
  };

  // ── Construire timeline ──
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    arr(loansRaw)
      // ✅ Filtre frontend : session_emprunt est l'UUID de la session mère
      .filter((l: any) => !session.id || String(l.session_emprunt) === String(session.id))
      .forEach((l: any) => items.push({
        id: `loan-${l.id}`, type: "emprunt",
        date: l.date_emprunt, amount: parseFloat(l.montant_emprunte) || 0,
        data: l, status: l.statut,
        memberName: extractMemberName(l), memberNumero: extractMemberNumero(l),
      }));

    arr(repaymentsRaw).forEach((r: any) => items.push({
      id: `rep-${r.id}`, type: "remboursement",
      date: r.date_remboursement, amount: parseFloat(r.montant) || 0,
      data: r,
      memberName: extractMemberName(r), memberNumero: extractMemberNumero(r),
    }));

    arr(solidarityRaw).forEach((sol: any) => items.push({
      id: `sol-${sol.id}`, type: "solidarite",
      date: sol.date_paiement, amount: parseFloat(sol.montant) || 0,
      data: sol,
      memberName: extractMemberName(sol), memberNumero: extractMemberNumero(sol),
    }));

    appendRenflouementPaymentsToTimeline(items, renflouementPaymentsRaw, session.id);

    arr(savingsRaw).forEach((sv: any) => items.push({
      id: `sav-${sv.id}`, type: "epargne",
      date: sv.date_transaction || sv.date_creation, amount: parseFloat(sv.montant) || 0,
      data: sv, status: sv.type_transaction_display || sv.type,
      memberName: extractMemberName(sv), memberNumero: extractMemberNumero(sv),
    }));

    arr(retraitsEpargneRaw)
    .filter((rt: any) => !session.id || String(rt.session) === String(session.id))
    .forEach((rt: any) => {
      items.push({
        id:           `retrait-epargne-${rt.id}`,
        type:         "retrait-epargne",
        date:         rt.date_retrait,
        amount:       parseFloat(rt.montant) || 0,
        data:         rt,
        memberName:   rt.membre_info?.nom   || extractMemberName(rt),
        memberNumero: rt.membre_info?.numero_membre || extractMemberNumero(rt),
      });
    });

    arr(assistancesRaw).forEach((a: any) => items.push({
      id: `ast-${a.id}`, type: "assistance",
      date: a.date_paiement || a.date_demande, amount: parseFloat(a.montant) || 0,
      data: a, status: a.statut,
      memberName: extractMemberName(a), memberNumero: extractMemberNumero(a),
    }));

    // ── Inscriptions reconstruites depuis les membres ──
    // Un membre est "inscrit dans cette session" si session_inscription === session.id
    arr(membersRaw)
      .filter((m: any) => String(m.session_inscription) === String(session.id))
      .forEach((m: any) => {
        const montant =
          parseFloat(m.donnees_financieres?.inscription?.montant_paye_inscription) || 0;
        const nom    = m.utilisateur?.nom_complet || m.utilisateur?.username || "Membre";
        const numero = m.numero_membre || "";
        items.push({
          id:           `ins-${m.id}`,
          type:         "paiement-inscription",
          date:         m.date_inscription || m.date_creation,
          amount:       montant,
          data:         { ...m, membre_info: { nom_complet: nom, numero_membre: numero } },
          memberName:   nom,
          memberNumero: numero,
        });
      });

    //return items; // tri appliqué dans sortedTimeline ci-dessous
  //}, [loansRaw, repaymentsRaw, solidarityRaw, renflouementRaw, savingsRaw, assistancesRaw, membersRaw, retraitsEpargneRaw, session.id]);

      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loansRaw, repaymentsRaw, solidarityRaw, renflouementPaymentsRaw, savingsRaw, assistancesRaw, membersRaw, retraitsEpargneRaw, session.id]);

  // ── Tri selon le choix utilisateur ──
  const sortedTimeline = useMemo(() => {
    const sorted = [...timeline];
    switch (sortBy) {
      case "member-asc":
        sorted.sort((a, b) => (a.memberName || "").localeCompare(b.memberName || ""));
        break;
      case "operation":
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "date-desc":
      default:
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    return sorted;
  }, [timeline, sortBy]);

  // ── Filtrage : d'abord par type, ensuite par nom de membre ──
  const filteredTimeline = useMemo(() => {
    let f = sortedTimeline;
    // 1. Filtre par type d'opération
    if (selectedFilter !== "all") f = f.filter((i) => i.type === selectedFilter);
    // 2. Recherche par nom ou numéro de membre
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      f = f.filter((i) =>
        (i.memberName   || "").toLowerCase().includes(q) ||
        (i.memberNumero || "").toLowerCase().includes(q)
      );
    }
    return f;
  }, [sortedTimeline, selectedFilter, searchText]);

  useMemo(() => setPage(1), [searchText, selectedFilter, sortBy]);

  const totalPages    = Math.max(1, Math.ceil(filteredTimeline.length / OPS_PER_PAGE));
  const pagedTimeline = filteredTimeline.slice((page - 1) * OPS_PER_PAGE, page * OPS_PER_PAGE);

  // Totaux par type (sur TOUTE la session, pas filtrés — pour la synthèse)
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
        {/* ── Synthèse : 7 boîtes toujours affichées ── */}
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
          <View style={s.sectionHeader}>
            <Ionicons name="stats-chart" size={18} color={THEME.colors.admin[500]} />
            <Text style={s.sectionTitle}>Bilan de la session</Text>
            <ExportButton onPress={handleExportSession} />
          </View>
          <SessionSummaryGrid
            totals={totals}
            collation={collation}
            autreDepense={autreDepense}
            motifDepense={motifDepense}
          />
        </View>

        {/* ── Filtres type ── */}
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm }}>
          <FilterChips selected={selectedFilter} onChange={setSelectedFilter} />
        </View>

        {/* ── Recherche par membre ── */}
        <View style={{ paddingHorizontal: SPACING.lg }}>
          <MemberSearchBar
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedFilter={selectedFilter}
            filteredCount={filteredTimeline.length}
            totalCount={timeline.length}
          />
        </View>

        {/* ── Liste opérations ── */}
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

      <OperationDetailModal item={selectedItem} onClose={() => setSelectedItem(null)}>
        {selectedItem?.type === "retrait-epargne" && (<>
          <DetailRow label="Montant retiré"    value={formatMoney(selectedItem.data.montant)} />
          <DetailRow label="Motif"             value={selectedItem.data.motif || "Aucun motif"} />
          <DetailRow label="Épargne restante"  value={formatMoney(selectedItem.data.epargne_disponible ?? 0)} />
          <DetailRow label="Session"           value={selectedItem.data.session_nom || "N/A"} />
        </>)}
      </OperationDetailModal>

      <TypeSelectionModal
        visible={typeModalVisible}
        onClose={() => setTypeModalVisible(false)}
        onSelect={(key) => proceedToExport("member-asc", key)}
      />

      {pendingExport && (
        <FormatSelectionModal
          visible={formatModalVisible}
          exportData={pendingExport.data}
          sessionExport={pendingExport.session}
          onClose={() => setFormatModalVisible(false)}
        />
      )}
    </>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { showExportMenu: showExportMenuExercice } = useHistoryExport();
  const { data: retraitsEpargneRaw } = useRetraitsEpargne();
  const { data: exercicesRaw, isLoading, error, refetch } = useExercises();
  const exercices: Exercise[] = arr(exercicesRaw).sort(
    (a: Exercise, b: Exercise) =>
      new Date(b.date_debut || "").getTime() - new Date(a.date_debut || "").getTime()
  );

  const [selectedExercice, setSelectedExercice] = useState<Exercise | null>(null);
  const [selectedSession,  setSelectedSession]  = useState<Session  | null>(null);
  const [exPage,           setExPage]           = useState(1); 
  const [exportingExercice, setExportingExercice] = useState(false);

  // Charger les données pour l'export d'exercice uniquement si exportingExercice est true
  const { data: loansRaw }        = useLoans({ exercice: selectedExercice?.id });
  const { data: repaymentsRaw }   = useRepayments({ exercice: selectedExercice?.id });
  const { data: solidarityRaw }   = useSolidarityPayments({ exercice: selectedExercice?.id });
  const { data: renflouementPaymentsRaw } = useRenflouementPayments(
    selectedExercice?.id ? { exercice: selectedExercice.id } : undefined
  );
  const { data: savingsRaw }      = useSavings({ exercice: selectedExercice?.id });
  const { data: assistancesRaw }  = useAssistances({ exercice: selectedExercice?.id });
  const { data: membersRaw }      = useMembers();

  const totalExPages   = Math.max(1, Math.ceil(exercices.length / EXERCISES_PER_PAGE));
  const pagedExercices = exercices.slice((exPage - 1) * EXERCISES_PER_PAGE, exPage * EXERCISES_PER_PAGE);

  const showDashboard = !!selectedExercice && !selectedSession;

  // ── Fonction pour construire les exports complets avec opérations (tri + filtre) ──
  const buildExerciceExportData = (exercice: Exercise, sessions: Session[], sortKey?: string, typeFilter?: string): ExportData => {
    const exportSessions: ExportSession[] = [];
    const exerciceFilterLabel = typeFilter && typeFilter !== "all"
      ? (OPERATION_CONFIG[typeFilter as keyof typeof OPERATION_CONFIG]?.label ?? typeFilter)
      : undefined;

    for (const session of sessions) {
      let items: TimelineItem[] = [];

      arr(loansRaw)
        .filter((l: any) => !session.id || String(l.session_emprunt) === String(session.id))
        .forEach((l: any) => items.push({
          id: `loan-${l.id}`, type: "emprunt",
          date: l.date_emprunt, amount: parseFloat(l.montant_emprunte) || 0,
          data: l, status: l.statut,
          memberName: extractMemberName(l), memberNumero: extractMemberNumero(l),
        }));

      arr(repaymentsRaw).forEach((r: any) => items.push({
        id: `rep-${r.id}`, type: "remboursement",
        date: r.date_remboursement, amount: parseFloat(r.montant) || 0,
        data: r,
        memberName: extractMemberName(r), memberNumero: extractMemberNumero(r),
      }));

      arr(solidarityRaw).forEach((sol: any) => items.push({
        id: `sol-${sol.id}`, type: "solidarite",
        date: sol.date_paiement, amount: parseFloat(sol.montant) || 0,
        data: sol,
        memberName: extractMemberName(sol), memberNumero: extractMemberNumero(sol),
      }));

      appendRenflouementPaymentsToTimeline(items, renflouementPaymentsRaw, session.id);

      arr(savingsRaw).forEach((sv: any) => items.push({
        id: `sav-${sv.id}`, type: "epargne",
        date: sv.date_transaction || sv.date_creation, amount: parseFloat(sv.montant) || 0,
        data: sv, status: sv.type_transaction_display || sv.type,
        memberName: extractMemberName(sv), memberNumero: extractMemberNumero(sv),
      }));

      arr(retraitsEpargneRaw)
      .filter((rt: any) => !session.id || String(rt.session) === String(session.id))
      .forEach((rt: any) => {
        items.push({
          id:           `retrait-epargne-${rt.id}`,
          type:         "retrait-epargne",
          date:         rt.date_retrait,
          amount:       parseFloat(rt.montant) || 0,
          data:         rt,
          memberName:   rt.membre_info?.nom || extractMemberName(rt),
          memberNumero: rt.membre_info?.numero_membre || extractMemberNumero(rt),
        });
      });

      arr(assistancesRaw).forEach((a: any) => items.push({
        id: `ast-${a.id}`, type: "assistance",
        date: a.date_paiement || a.date_demande, amount: parseFloat(a.montant) || 0,
        data: a, status: a.statut,
        memberName: extractMemberName(a), memberNumero: extractMemberNumero(a),
      }));

      arr(membersRaw)
        .filter((m: any) => String(m.session_inscription) === String(session.id))
        .forEach((m: any) => {
          const montant = parseFloat(m.donnees_financieres?.inscription?.montant_paye_inscription) || 0;
          const nom    = m.utilisateur?.nom_complet || m.utilisateur?.username || "Membre";
          const numero = m.numero_membre || "";
          items.push({
            id:           `ins-${m.id}`,
            type:         "paiement-inscription",
            date:         m.date_inscription || m.date_creation,
            amount:       montant,
            data:         { ...m, membre_info: { nom_complet: nom, numero_membre: numero } },
            memberName:   nom,
            memberNumero: numero,
          });
        });

      // Calculer les totaux AVANT le filtre (bilan complet toujours affiché)
      const totals: Record<string, number> = {};
      items.forEach((i) => { totals[i.type] = (totals[i.type] || 0) + i.amount; });

      // Filtre par type si spécifié
      if (typeFilter && typeFilter !== "all") {
        items = items.filter(i => i.type === typeFilter);
      }

      // Tri
      switch (sortKey || "member-asc") {
        case "member-asc":
          items.sort((a, b) => (a.memberName || "").localeCompare(b.memberName || ""));
          break;
        case "operation":
          items.sort((a, b) => a.type.localeCompare(b.type));
          break;
        case "date-desc":
        default:
          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          break;
      }

      exportSessions.push({
        id:           String(session.id),
        nom:          session.nom || "Session",
        date:         (session as any).date_session || "",
        collation:    0,
        autreDepense: 0,
        motifDepense: "",
        totals,
        filterLabel:  exerciceFilterLabel,
        operations:   items.map((i) => ({
          type:         i.type,
          typeLabel:    OPERATION_CONFIG[i.type]?.label ?? i.type,
          memberName:   i.memberName || "",
          memberNumero: i.memberNumero || "",
          amount:       i.amount,
          date:         i.date,
        })),
      });
    }

    return {
      exerciceNom:  exercice.nom,
      exerciceDate: (exercice as any).date_debut || "",
      sessions:     exportSessions,
      filterLabel:  exerciceFilterLabel,
    };
  };

  const [exFormatModalVisible, setExFormatModalVisible] = useState(false);
  const [exExportData, setExExportData] = useState<ExportData | null>(null);
  const [exSessions, setExSessions] = useState<Session[] | null>(null);
  const [exTypeModalVisible, setExTypeModalVisible] = useState(false);

  const proceedToExerciceExport = (sortKey: string, typeFilter?: string) => {
    if (!selectedExercice || !exSessions) return;
    const exportData = buildExerciceExportData(selectedExercice, exSessions, sortKey, typeFilter);
    setExExportData(exportData);
    setExFormatModalVisible(true);
  };

  const showExerciceTypeSelection = () => {
    setExTypeModalVisible(true);
  };

  const handleExerciceExportStart = (sessions: Session[]) => {
    if (!selectedExercice) return;
    setExSessions(sessions);
    Alert.alert(
      "Ordre de tri",
      "Choisissez l'ordre des opérations pour l'export de l'exercice :",
      [
        { text: "👤 Membre A→Z (recommandé)", onPress: () => proceedToExerciceExport("member-asc") },
        { text: "📅 Date ↓ (récent → ancien)", onPress: () => proceedToExerciceExport("date-desc") },
        { text: "📁 Par type d'opération",     onPress: showExerciceTypeSelection },
        { text: "Annuler",                     style: "cancel" },
      ]
    );
  };

  const handleExportExercice = (sessions: Session[]) => {
    handleExerciceExportStart(sessions);
  };

  if (isLoading && !selectedExercice) return <LoadingView message="Chargement des exercices…" />;
  if (error    && !selectedExercice)  return <ErrorView  message="Impossible de charger les exercices" onRetry={refetch} />;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient colors={THEME.gradients.dark} style={s.header}>
        <View style={s.headerRow}>
          {(selectedExercice || selectedSession) && (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => { if (selectedSession) setSelectedSession(null); else setSelectedExercice(null); }}
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {selectedSession ? selectedSession.nom : selectedExercice ? selectedExercice.nom : "Historique"}
            </Text>
            <Text style={s.headerSub}>
              {selectedSession
                ? `Exercice  ·  ${selectedExercice?.nom}`
                : selectedExercice ? "Sélectionnez une session" : "Tous les exercices"}
            </Text>
          </View>
          <View style={s.adminPill}>
            <Ionicons name="shield-checkmark" size={12} color="white" />
            <Text style={s.adminPillText}>Admin</Text>
          </View>
        </View>

        <Breadcrumb
          exercice={selectedExercice} session={selectedSession}
          onReset={() => { setSelectedSession(null); setSelectedExercice(null); }}
          onBackToExercice={() => setSelectedSession(null)}
        />

        {showDashboard && <ExerciseDashboard exercice={selectedExercice!} />}
      </LinearGradient>

      {/* ── Vue 1 : exercices ── */}
      {!selectedExercice && (
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
                    onPress={() => { setSelectedExercice(ex); setExPage(1); }}
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

      {selectedExercice && !selectedSession && (
        <SessionsView
          exercice={selectedExercice}
          onSelectSession={setSelectedSession}
          onExportExercice={handleExportExercice}
        />
      )}

      {selectedExercice && selectedSession && (
        <OperationsView session={selectedSession} />
      )}

      <TypeSelectionModal
        visible={exTypeModalVisible}
        onClose={() => setExTypeModalVisible(false)}
        onSelect={(key) => proceedToExerciceExport("member-asc", key)}
      />

      {exExportData && (
        <FormatSelectionModal
          visible={exFormatModalVisible}
          exportData={exExportData}
          onClose={() => setExFormatModalVisible(false)}
          isExercice
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },

  // Header
  header:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginRight: SPACING.sm },
  headerTitle:{ fontSize: FONT_SIZES.xl, fontWeight: "800", color: "white" },
  headerSub:  { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  adminPill:  { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: 20, gap: 4 },
  adminPillText: { fontSize: 11, color: "white", fontWeight: "700" },

  // Breadcrumb
  breadcrumb: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: SPACING.sm },
  crumb:      { fontSize: 12 },
  crumbLink:  { color: "rgba(255,255,255,0.6)", fontWeight: "500" },
  crumbActive:{ color: "white", fontWeight: "700" },

  // Dashboard exercice (grille 2x2)
  // Dashboard exercice - tableau (meme style que bilan session)
  dashCard:        { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden", marginTop: SPACING.sm },
  dashTableHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  dashHeaderCell:  { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.5 },
  dashTableRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.md, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.15)" },
  dashRowLeft:     { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flex: 1 },
  dashDot:         { width: 8, height: 8, borderRadius: 4 },
  dashRowLabel:    { fontSize: FONT_SIZES.sm, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  dashRowValue:    { fontSize: FONT_SIZES.sm, fontWeight: "700", textAlign: "right" },
  dashRowValueZero:{ color: "rgba(255,255,255,0.4)", fontWeight: "400" },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
  sectionTitle:  { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[700] },

  // Exercice card — gradient plein comme les cartes de l'app
  exerciceCard: { marginBottom: SPACING.md, borderRadius: 20, overflow: "hidden", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
  exerciceCardGradient: { flexDirection: "row", alignItems: "center", padding: SPACING.md + 4 },
  exerciceIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  exerciceTextBlock: { flex: 1 },
  exerciceNom:   { fontSize: FONT_SIZES.lg, fontWeight: "800", color: "white" },
  exerciceDates: { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  exerciceStatusBadge: { marginTop: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: 20 },
  exerciceStatusText: { fontSize: 11, color: "white", fontWeight: "700" },
  exerciceArrow: { paddingLeft: SPACING.sm },

  // Session card — même style
  sessionCard: { marginBottom: SPACING.md, borderRadius: 18, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 5 },
  sessionCardGradient: { flexDirection: "row", alignItems: "center", padding: SPACING.md },
  sessionIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  sessionTextBlock: { flex: 1 },
  sessionNom:   { fontSize: FONT_SIZES.md, fontWeight: "700", color: "white" },
  sessionDate:  { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  sessionStatusBadge: { marginTop: 5, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 20 },
  sessionStatusText: { fontSize: 11, color: "white", fontWeight: "700" },

  // Synthèse session — tableau Option A
  summaryCard:          { backgroundColor: "white", borderRadius: 16, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  summaryTableHeader:   { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  summaryHeaderCell:    { fontSize: 11, fontWeight: "700", color: THEME.colors.neutral[400], textTransform: "uppercase", letterSpacing: 0.5 },
  summaryTableRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.md, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: "#F1F5F9" },
  summaryRowLeft:       { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flex: 1 },
  summaryDot:           { width: 8, height: 8, borderRadius: 4 },
  summaryRowLabel:      { fontSize: FONT_SIZES.sm, fontWeight: "600", color: THEME.colors.neutral[800] },
  summaryRowAmount:     { fontSize: FONT_SIZES.sm, fontWeight: "700", textAlign: "right" },
  summaryRowAmountZero: { color: THEME.colors.neutral[400], fontWeight: "400" },

  // Filtres
  filterScroll: { marginBottom: SPACING.sm },
  filterRow:    { flexDirection: "row", paddingHorizontal: 2 },
  filterChip:   { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 20, paddingHorizontal: SPACING.md, paddingVertical: 7, marginHorizontal: 3, gap: 4, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: "600", color: THEME.colors.neutral[600] },

  // Sort chips
  sortRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  sortChip:     { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, gap: 3, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  sortChipActive: { backgroundColor: COLORS.primary },
  sortChipText: { fontSize: 11, fontWeight: "600", color: THEME.colors.neutral[600] },

  // Recherche
  searchWrapper: { marginBottom: SPACING.md },
  searchBox:     { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, paddingHorizontal: SPACING.md, paddingVertical: 10, gap: SPACING.sm, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  searchInput:   { flex: 1, fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[800] },
  searchCount:   { fontSize: 11, color: THEME.colors.neutral[500], textAlign: "center", marginTop: 5 },

  // Opération card — fond blanc avec bande colorée gauche
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

  // Pagination
  pagination:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.lg, marginVertical: SPACING.lg },
  pageBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: "white", alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  pageLabelBox: { backgroundColor: "white", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20, elevation: 1 },
  pageLabel:    { fontSize: FONT_SIZES.sm, fontWeight: "700", color: THEME.colors.neutral[700] },

  // Modal
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

  // Separateur depenses dans le bilan session
  summaryDepSep:     { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: 8, gap: SPACING.sm },
  summaryDepSepLine: { flex: 1, height: 0.5, backgroundColor: THEME.colors.neutral[200] },
  summaryDepSepText: { fontSize: 10, fontWeight: "700", color: THEME.colors.neutral[400], textTransform: "uppercase", letterSpacing: 0.5 },
  summaryDepMotif:   { fontSize: 10, color: THEME.colors.neutral[400], marginTop: 2, fontStyle: "italic" },

  // Modal type
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  typeModalContainer:{ backgroundColor: "white", borderRadius: 20, width: "100%", maxHeight: SCREEN_HEIGHT * 0.7, overflow: "hidden", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
  typeModalHeader:   { flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.sm },
  typeModalTitle:    { fontSize: FONT_SIZES.lg, fontWeight: "800", color: THEME.colors.neutral[800] },
  typeModalSub:      { fontSize: FONT_SIZES.xs, color: THEME.colors.neutral[500], paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, lineHeight: 16 },
  typeModalList:     { paddingHorizontal: SPACING.lg, maxHeight: SCREEN_HEIGHT * 0.4 },
  typeModalItem:     { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: SPACING.md },
  typeModalIcon:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  typeModalItemText: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: "600", color: THEME.colors.neutral[800] },
  typeModalCancel:   { paddingVertical: SPACING.md, alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: SPACING.sm },
  typeModalCancelText:{ fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.primary },

  // Format modal
  formatModalList:      { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  formatModalItem:      { flexDirection: "row", alignItems: "center", padding: SPACING.md, backgroundColor: "#F8FAFC", borderRadius: 14, gap: SPACING.md },
  formatModalIcon:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  formatModalTextBlock: { flex: 1 },
  formatModalItemText:  { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[800] },
  formatModalItemSub:   { fontSize: FONT_SIZES.xs, color: THEME.colors.neutral[500], marginTop: 2 },

  // Bouton export
  exportBtn:     { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto",
                   backgroundColor: COLORS.primary, borderRadius: 20,
                   paddingHorizontal: SPACING.md, paddingVertical: 7, elevation: 3,
                   shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
                   shadowOpacity: 0.3, shadowRadius: 4 },
  exportBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
});
