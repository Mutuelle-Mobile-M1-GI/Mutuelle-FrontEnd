import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
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
import { useMembers } from "../../hooks/useMember"; // adapte si le nom diffère
import { Exercise } from "../../types/exercise.types";
import { Session } from "../../types/session.types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const EXERCISES_PER_PAGE = 6;
const OPS_PER_PAGE       = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineItem = {
  id: string;
  type:
    | "emprunt" | "remboursement" | "solidarite" | "renflouement"
    | "epargne"  | "assistance"   | "paiement-inscription";
  date: string;
  amount: number;
  data: any;
  status?: string;
  memberName?: string;
  memberNumero?: string;
};

// ─── Design system ────────────────────────────────────────────────────────────

const THEME = {
  colors: {
    primary: { 50: "#EFF6FF", 100: "#DBEAFE", 500: COLORS.primary, 600: "#2563EB", 700: "#1D4ED8" },
    success: { 50: "#ECFDF5", 500: "#10B981", 600: "#059669" },
    warning: { 50: "#FFFBEB", 500: "#F59E0B", 600: "#D97706" },
    error:   { 50: "#FEF2F2", 500: "#EF4444", 600: "#DC2626" },
    neutral: { 50: "#FAFAFA", 100: "#F5F5F5", 200: "#E5E5E5", 300: "#D4D4D4",
               400: "#A3A3A3", 500: "#737373", 600: "#525252", 700: "#404040",
               800: "#262626", 900: "#171717" },
    admin:   { 50: "#F0FDF4", 500: "#22C55E", 600: "#16A34A" },
  },
  gradients: {
    primary: [COLORS.primary, "#2563EB"] as [string, string],
    admin:   ["#16A34A", "#15803D"]      as [string, string],
    success: ["#10B981", "#059669"]      as [string, string],
    warning: ["#F59E0B", "#D97706"]      as [string, string],
    error:   ["#EF4444", "#DC2626"]      as [string, string],
    purple:  ["#8B5CF6", "#7C3AED"]      as [string, string],
    pink:    ["#EC4899", "#DB2777"]      as [string, string],
    cyan:    ["#06B6D4", "#0891B2"]      as [string, string],
    glass:   ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.80)"] as [string, string],
  },
};

const OPERATION_CONFIG = {
  emprunt:              { label: "Emprunt",            icon: "trending-up",       color: THEME.colors.primary[500], gradient: THEME.gradients.primary, bgColor: THEME.colors.primary[50] },
  remboursement:        { label: "Remboursement",       icon: "arrow-down-circle", color: THEME.colors.success[500], gradient: THEME.gradients.success, bgColor: THEME.colors.success[50] },
  solidarite:           { label: "Solidarité",          icon: "people",            color: THEME.colors.warning[500], gradient: THEME.gradients.warning, bgColor: THEME.colors.warning[50] },
  renflouement:         { label: "Renflouement",        icon: "refresh-circle",    color: THEME.colors.error[500],   gradient: THEME.gradients.error,   bgColor: THEME.colors.error[50]   },
  epargne:              { label: "Épargne",             icon: "wallet",            color: "#8B5CF6",                 gradient: THEME.gradients.purple,  bgColor: "#F3E8FF"                },
  assistance:           { label: "Assistance",          icon: "heart",             color: "#EC4899",                 gradient: THEME.gradients.pink,    bgColor: "#FCE7F3"                },
  "paiement-inscription": { label: "Inscription",      icon: "school",            color: "#06B6D4",                 gradient: THEME.gradients.cyan,    bgColor: "#ECFDFE"                },
} as const;

// ─── Utilitaires ─────────────────────────────────────────────────────────────

// Formatage avec espaces comme séparateurs de milliers (norme française)
const formatMoney = (val: number | string | undefined): string => {
  if (typeof val === "string") val = parseFloat(val);
  if (typeof val !== "number" || isNaN(val)) return "--";
  return val.toLocaleString("fr-FR") + " FCFA";
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
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateStr.slice(0, 10); }
};

const arr = (raw: any): any[] =>
  Array.isArray(raw) ? raw : raw?.results ?? raw?.assistances ?? [];

// Extrait le nom du membre depuis différentes structures API possibles
// ⚠️ Ajuste les champs selon le vrai retour de ton API (console.log à faire)
const extractMemberName = (obj: any): string | undefined =>
  obj?.membre_nom_complet         ||
  obj?.membre_nom                 ||
  obj?.membre?.nom_complet        ||
  obj?.membre?.utilisateur?.nom_complet ||
  undefined;

const extractMemberNumero = (obj: any): string | undefined =>
  obj?.membre_numero              ||
  obj?.membre?.numero_membre      ||
  undefined;

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

const Breadcrumb = ({ exercice, session, onReset, onBackToExercice }: {
  exercice: Exercise | null; session: Session | null;
  onReset: () => void; onBackToExercice: () => void;
}) => (
  <View style={s.breadcrumb}>
    <TouchableOpacity onPress={onReset}>
      <Text style={[s.crumbItem, s.crumbLink]}>Exercices</Text>
    </TouchableOpacity>
    {exercice && (
      <>
        <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.5)" />
        <TouchableOpacity onPress={onBackToExercice}>
          <Text style={[s.crumbItem, session ? s.crumbLink : s.crumbActive]}>{exercice.nom}</Text>
        </TouchableOpacity>
      </>
    )}
    {session && (
      <>
        <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.5)" />
        <Text style={[s.crumbItem, s.crumbActive]} numberOfLines={1}>{session.nom}</Text>
      </>
    )}
  </View>
);

// ─── Dashboard exercice ───────────────────────────────────────────────────────

const ExerciseDashboard = ({ exercice }: { exercice: Exercise }) => {
  const { data: loansRaw }   = useLoans({ exercice: exercice.id });
  const { data: savingsRaw } = useSavings({ exercice: exercice.id });
  const { data: membersRaw } = useMembers({ exercice: exercice.id });

  const totalEmprunts = useMemo(
    () => arr(loansRaw).reduce((sum: number, l: any) => sum + (parseFloat(l.montant_emprunte) || 0), 0),
    [loansRaw]
  );

  const totalEpargne = useMemo(
    () => arr(savingsRaw).reduce((sum: number, e: any) => sum + (parseFloat(e.montant) || 0), 0),
    [savingsRaw]
  );

  const nombreMembres = arr(membersRaw).length;

  // Fonds social : déjà dans l'objet exercice retourné par l'API
  const fondsSocial = (exercice as any)?.fonds_social_info?.montant_total ?? 0;

  const metrics = [
    { label: "Fonds social",      value: formatMoney(fondsSocial),  icon: "shield-checkmark", color: THEME.colors.admin[500]   },
    { label: "Total emprunts",    value: formatMoney(totalEmprunts), icon: "trending-up",      color: THEME.colors.primary[500] },
    { label: "Total épargnes",    value: formatMoney(totalEpargne),  icon: "wallet",           color: "#8B5CF6"                 },
    { label: "Membres actifs",    value: String(nombreMembres),      icon: "people",           color: THEME.colors.warning[500] },
  ];

  return (
    <View style={s.dashboard}>
      <View style={s.dashGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={s.dashCard}>
            <LinearGradient colors={THEME.gradients.glass} style={s.dashCardInner}>
              <View style={[s.dashIconWrap, { backgroundColor: m.color + "20" }]}>
                <Ionicons name={m.icon as any} size={16} color={m.color} />
              </View>
              <Text style={s.dashLabel} numberOfLines={1}>{m.label}</Text>
              <Text style={[s.dashValue, { color: m.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {m.value}
              </Text>
            </LinearGradient>
          </View>
        ))}
      </View>
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
        onPressIn ={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <LinearGradient colors={THEME.gradients.glass} style={s.exerciceCardInner}>
          <View style={[s.statusDot, { backgroundColor: isActive ? THEME.colors.success[500] : THEME.colors.neutral[400] }]} />
          <LinearGradient
            colors={isActive ? THEME.gradients.admin : [THEME.colors.neutral[400], THEME.colors.neutral[600]]}
            style={s.exerciceIconBg}
          >
            <Ionicons name="calendar" size={26} color="white" />
          </LinearGradient>
          <View style={s.exerciceTextBlock}>
            <Text style={s.exerciceYear}>{exercice.nom}</Text>
            <View style={[s.badge, { backgroundColor: isActive ? THEME.colors.admin[50] : THEME.colors.neutral[100] }]}>
              <Text style={[s.badgeText, { color: isActive ? THEME.colors.admin[600] : THEME.colors.neutral[600] }]}>
                {isActive ? "● En cours" : "Clôturé"}
              </Text>
            </View>
            {exercice.date_debut && (
              <Text style={s.smallDate}>
                {new Date(exercice.date_debut).toLocaleDateString("fr-FR")}
                {exercice.date_fin
                  ? ` → ${new Date(exercice.date_fin).toLocaleDateString("fr-FR")}`
                  : " → En cours"}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.colors.neutral[400]} />
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
        <LinearGradient colors={THEME.gradients.glass} style={s.sessionCardInner}>
          <LinearGradient
            colors={isOpen ? THEME.gradients.primary : [THEME.colors.neutral[400], THEME.colors.neutral[600]]}
            style={s.sessionIconBg}
          >
            <Ionicons name="folder-open" size={22} color="white" />
          </LinearGradient>
          <View style={s.sessionTextBlock}>
            <Text style={s.sessionName}>{session.nom}</Text>
            <View style={[s.badge, { backgroundColor: isOpen ? THEME.colors.primary[50] : THEME.colors.neutral[100] }]}>
              <Text style={[s.badgeText, { color: isOpen ? THEME.colors.primary[600] : THEME.colors.neutral[600] }]}>
                {isOpen ? "● Ouverte" : "Fermée"}
              </Text>
            </View>
            {session.date_session && (
              <Text style={s.smallDate}>
                {new Date(session.date_session).toLocaleDateString("fr-FR")}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.colors.neutral[400]} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Filtres / Recherche ──────────────────────────────────────────────────────

const SearchAndFilters = ({ searchText, onSearchChange, selectedFilter, onFilterChange, totalItems, filteredItems }: any) => {
  const [showFilters, setShowFilters] = useState(false);
  const filters = [
    { key: "all",                   label: "Tout",           icon: "list"             },
    { key: "emprunt",               label: "Emprunts",       icon: "trending-up"      },
    { key: "remboursement",         label: "Remboursements", icon: "arrow-down-circle" },
    { key: "solidarite",            label: "Solidarité",     icon: "people"           },
    { key: "renflouement",          label: "Renflouements",  icon: "refresh-circle"   },
    { key: "epargne",               label: "Épargne",        icon: "wallet"           },
    { key: "assistance",            label: "Assistances",    icon: "heart"            },
    { key: "paiement-inscription",  label: "Inscription",    icon: "school"           },
  ];

  return (
    <View style={s.searchContainer}>
      <LinearGradient colors={THEME.gradients.glass} style={s.searchBar}>
        <Ionicons name="search" size={18} color={THEME.colors.neutral[400]} />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher par membre, montant, type…"
          value={searchText}
          onChangeText={onSearchChange}
          placeholderTextColor={THEME.colors.neutral[400]}
        />
        <TouchableOpacity style={s.filterToggle} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="filter" size={18} color={showFilters ? THEME.colors.primary[500] : THEME.colors.neutral[400]} />
        </TouchableOpacity>
      </LinearGradient>

      <Text style={s.resultsCounter}>
        {filteredItems} opération{filteredItems !== 1 ? "s" : ""} trouvée{filteredItems !== 1 ? "s" : ""}
        {(searchText || selectedFilter !== "all") ? ` sur ${totalItems}` : ""}
      </Text>

      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
          <View style={{ flexDirection: "row", paddingHorizontal: SPACING.xs }}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, selectedFilter === f.key && s.filterChipActive]}
                onPress={() => onFilterChange(f.key)}
              >
                <Ionicons name={f.icon as any} size={13} color={selectedFilter === f.key ? "white" : THEME.colors.neutral[600]} />
                <Text style={[s.filterChipText, selectedFilter === f.key && { color: "white" }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
        <LinearGradient colors={THEME.gradients.glass} style={s.opCardInner}>
          <LinearGradient colors={config.gradient} style={s.opIcon}>
            <Ionicons name={config.icon as any} size={20} color="white" />
          </LinearGradient>

          <View style={s.opContent}>
            {/* Type + date */}
            <View style={s.opRow}>
              <Text style={s.opType}>{config.label}</Text>
              <Text style={s.opDate}>{formatDateSmart(item.date)}</Text>
            </View>

            {/* Montant */}
            <Text style={[s.opAmount, { color: config.color }]}>{formatMoney(item.amount)}</Text>

            {/* Membre */}
            {item.memberName && (
              <View style={s.opMemberRow}>
                <Ionicons name="person-circle-outline" size={13} color={THEME.colors.neutral[400]} />
                <Text style={s.opMember}>
                  {item.memberName}{item.memberNumero ? `  ·  ${item.memberNumero}` : ""}
                </Text>
              </View>
            )}

            {/* Statut */}
            {item.status && (
              <View style={[s.opBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[s.opBadgeText, { color: config.color }]}>{item.status}</Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={16} color={THEME.colors.neutral[400]} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Détail opération ─────────────────────────────────────────────────────────

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
          <LinearGradient colors={THEME.gradients.glass} style={s.modalContent}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <LinearGradient colors={config.gradient} style={s.modalHeaderIcon}>
                <Ionicons name={config.icon as any} size={28} color="white" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{config.label}</Text>
                <Text style={s.modalSubtitle}>
                  {formatDateSmart(item.date)}{item.date?.length > 10 ? `  ·  ${item.date.slice(11, 16)}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.modalClose}>
                <Ionicons name="close" size={22} color={THEME.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={s.modalAmountBox}>
              <Text style={s.modalAmountLabel}>Montant</Text>
              <Text style={[s.modalAmountValue, { color: config.color }]}>{formatMoney(item.amount)}</Text>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
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
                <DetailRow label="Type"     value={item.data.type || "Dépôt"} />
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
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// ─── Utilitaires UI ──────────────────────────────────────────────────────────

const LoadingView = ({ message = "Chargement…" }: { message?: string }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: SPACING.md }}>
    <LinearGradient colors={THEME.gradients.admin} style={{ borderRadius: 40, padding: 20 }}>
      <Ionicons name="analytics" size={40} color="white" />
    </LinearGradient>
    <Text style={{ color: THEME.colors.neutral[600], fontSize: FONT_SIZES.md }}>{message}</Text>
  </View>
);

const ErrorView = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.xl }}>
    <Ionicons name="alert-circle" size={56} color={THEME.colors.error[500]} />
    <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: "700", color: THEME.colors.error[600], marginTop: SPACING.md, textAlign: "center" }}>{message}</Text>
    <TouchableOpacity onPress={onRetry} style={{ marginTop: SPACING.lg }}>
      <LinearGradient colors={THEME.gradients.primary} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg, gap: SPACING.sm }}>
        <Ionicons name="refresh" size={18} color="white" />
        <Text style={{ color: "white", fontWeight: "600" }}>Réessayer</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={{ alignItems: "center", paddingVertical: SPACING.xl * 2 }}>
    <Ionicons name="document-text-outline" size={56} color={THEME.colors.neutral[300]} />
    <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: "600", color: THEME.colors.neutral[600], marginTop: SPACING.md }}>{title}</Text>
    <Text style={{ fontSize: FONT_SIZES.md, color: THEME.colors.neutral[400], textAlign: "center", marginTop: SPACING.xs, paddingHorizontal: SPACING.lg }}>{subtitle}</Text>
  </View>
);

const PaginationBar = ({ current, total, onPrev, onNext }: {
  current: number; total: number; onPrev: () => void; onNext: () => void;
}) => (
  <View style={s.paginationBar}>
    <TouchableOpacity
      style={[s.pageBtn, current === 1 && s.pageBtnDisabled]}
      onPress={onPrev} disabled={current === 1}
    >
      <Ionicons name="chevron-back" size={18} color={current === 1 ? THEME.colors.neutral[300] : THEME.colors.primary[500]} />
    </TouchableOpacity>
    <Text style={s.pageLabel}>Page {current} sur {total}</Text>
    <TouchableOpacity
      style={[s.pageBtn, current === total && s.pageBtnDisabled]}
      onPress={onNext} disabled={current === total}
    >
      <Ionicons name="chevron-forward" size={18} color={current === total ? THEME.colors.neutral[300] : THEME.colors.primary[500]} />
    </TouchableOpacity>
  </View>
);

// ─── Vue sessions ─────────────────────────────────────────────────────────────

const SessionsView = ({ exercice, onSelectSession }: {
  exercice: Exercise; onSelectSession: (s: Session) => void;
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
        <Ionicons name="folder-open" size={18} color={THEME.colors.primary[500]} />
        <Text style={s.sectionTitle}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</Text>
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

    arr(loansRaw).forEach((loan: any) => items.push({
      id: `loan-${loan.id}`, type: "emprunt",
      date: loan.date_emprunt, amount: parseFloat(loan.montant_emprunte) || 0,
      data: loan, status: loan.statut,
      memberName: extractMemberName(loan), memberNumero: extractMemberNumero(loan),
    }));

    arr(repaymentsRaw).forEach((rep: any) => items.push({
      id: `rep-${rep.id}`, type: "remboursement",
      date: rep.date_remboursement, amount: parseFloat(rep.montant) || 0,
      data: rep,
      memberName: extractMemberName(rep), memberNumero: extractMemberNumero(rep),
    }));

    arr(solidarityRaw).forEach((sol: any) => items.push({
      id: `sol-${sol.id}`, type: "solidarite",
      date: sol.date_paiement, amount: parseFloat(sol.montant) || 0,
      data: sol,
      memberName: extractMemberName(sol), memberNumero: extractMemberNumero(sol),
    }));

    arr(renflouementRaw).forEach((renf: any) => {
      (renf.paiements_details || []).forEach((pay: any) => items.push({
        id: `renf-${pay.id}`, type: "renflouement",
        date: pay.date_paiement, amount: parseFloat(pay.montant) || 0,
        data: { ...pay, cause: renf.cause },
        memberName: extractMemberName(pay), memberNumero: extractMemberNumero(pay),
      }));
    });

    arr(savingsRaw).forEach((saving: any) => items.push({
      id: `saving-${saving.id}`, type: "epargne",
      date: saving.date_transaction || saving.date_creation,
      amount: parseFloat(saving.montant) || 0,
      data: saving, status: saving.type || "Dépôt",
      memberName: extractMemberName(saving), memberNumero: extractMemberNumero(saving),
    }));

    arr(assistancesRaw).forEach((a: any) => items.push({
      id: `assist-${a.id}`, type: "assistance",
      date: a.date_paiement || a.date_demande, amount: parseFloat(a.montant) || 0,
      data: a, status: a.statut,
      memberName: extractMemberName(a), memberNumero: extractMemberNumero(a),
    }));

    arr(inscriptionPaymentsRaw).forEach((p: any) => items.push({
      id: `ins-${p.id}`, type: "paiement-inscription",
      date: p.date_paiement, amount: parseFloat(p.montant) || 0,
      data: p,
      memberName: extractMemberName(p), memberNumero: extractMemberNumero(p),
    }));

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loansRaw, repaymentsRaw, solidarityRaw, renflouementRaw, savingsRaw, assistancesRaw, inscriptionPaymentsRaw]);

  const filteredTimeline = useMemo(() => {
    let f = timeline;
    if (selectedFilter !== "all") f = f.filter((i) => i.type === selectedFilter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      f = f.filter((i) =>
        OPERATION_CONFIG[i.type].label.toLowerCase().includes(q) ||
        formatMoney(i.amount).toLowerCase().includes(q) ||
        (i.memberName   || "").toLowerCase().includes(q) ||
        (i.memberNumero || "").toLowerCase().includes(q) ||
        (i.data.notes   || "").toLowerCase().includes(q)
      );
    }
    return f;
  }, [timeline, selectedFilter, searchText]);

  useMemo(() => setPage(1), [searchText, selectedFilter]);

  const totalPages    = Math.max(1, Math.ceil(filteredTimeline.length / OPS_PER_PAGE));
  const pagedTimeline = filteredTimeline.slice((page - 1) * OPS_PER_PAGE, page * OPS_PER_PAGE);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    filteredTimeline.forEach((i) => { t[i.type] = (t[i.type] || 0) + i.amount; });
    return t;
  }, [filteredTimeline]);

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120, paddingTop: SPACING.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Synthèse */}
        <View style={s.sessionSummary}>
          <LinearGradient colors={THEME.gradients.glass} style={s.sessionSummaryInner}>
            <View style={s.sessionSummaryHeader}>
              <LinearGradient colors={THEME.gradients.admin} style={s.sessionSummaryIcon}>
                <Ionicons name="stats-chart" size={18} color="white" />
              </LinearGradient>
              <Text style={s.sessionSummaryTitle}>Synthèse de la session</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                {Object.entries(totals).map(([type, total]) => {
                  const cfg = OPERATION_CONFIG[type as keyof typeof OPERATION_CONFIG];
                  return (
                    <View key={type} style={[s.summaryChip, { backgroundColor: cfg.bgColor }]}>
                      <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                      <Text style={[s.summaryChipLabel, { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={[s.summaryChipValue, { color: cfg.color }]}>{formatMoney(total)}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>

        {/* Filtres */}
        <SearchAndFilters
          searchText={searchText}       onSearchChange={setSearchText}
          selectedFilter={selectedFilter} onFilterChange={setSelectedFilter}
          totalItems={timeline.length}    filteredItems={filteredTimeline.length}
        />

        {/* Liste */}
        {filteredTimeline.length === 0 ? (
          <EmptyState
            title={searchText || selectedFilter !== "all" ? "Aucun résultat" : "Aucune opération"}
            subtitle={searchText || selectedFilter !== "all"
              ? "Modifiez vos critères de recherche"
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
      </ScrollView>

      <OperationDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminHistoryScreen() {
  const insets = useSafeAreaInsets();

  const { data: exercicesRaw, isLoading, error, refetch } = useExercises();
  const exercices: Exercise[] = arr(exercicesRaw).sort(
    (a: Exercise, b: Exercise) =>
      new Date(b.date_debut || "").getTime() - new Date(a.date_debut || "").getTime()
  );

  const [selectedExercice, setSelectedExercice] = useState<Exercise | null>(null);
  const [selectedSession,  setSelectedSession]  = useState<Session  | null>(null);
  const [exPage,           setExPage]           = useState(1);

  const totalExPages   = Math.max(1, Math.ceil(exercices.length / EXERCISES_PER_PAGE));
  const pagedExercices = exercices.slice((exPage - 1) * EXERCISES_PER_PAGE, exPage * EXERCISES_PER_PAGE);

  const showDashboard = !!selectedExercice && !selectedSession;

  const headerTitle = selectedSession
    ? selectedSession.nom
    : selectedExercice ? selectedExercice.nom : "Historique Global";

  const headerSubtitle = selectedSession
    ? `Exercice  ·  ${selectedExercice?.nom}`
    : selectedExercice ? "Sélectionnez une session" : "Tous les exercices";

  if (isLoading && !selectedExercice) return <LoadingView message="Chargement des exercices…" />;
  if (error    && !selectedExercice)  return <ErrorView  message="Impossible de charger les exercices" onRetry={refetch} />;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={THEME.gradients.admin} style={s.header}>
        <View style={s.headerTop}>
          {(selectedExercice || selectedSession) && (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => { if (selectedSession) setSelectedSession(null); else setSelectedExercice(null); }}
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>📊  {headerTitle}</Text>
            <Text style={s.headerSubtitle}>{headerSubtitle}</Text>
          </View>
          <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]} style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={13} color="white" />
            <Text style={s.adminBadgeText}>Admin</Text>
          </LinearGradient>
        </View>

        <Breadcrumb
          exercice={selectedExercice} session={selectedSession}
          onReset={() => { setSelectedSession(null); setSelectedExercice(null); }}
          onBackToExercice={() => setSelectedSession(null)}
        />

        {/* Dashboard affiché uniquement sur la vue "sessions de l'exercice" */}
        {showDashboard && <ExerciseDashboard exercice={selectedExercice!} />}
      </LinearGradient>

      {/* Contenu */}
      {!selectedExercice && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120, paddingTop: SPACING.md }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={THEME.colors.admin[500]} />
            <Text style={s.sectionTitle}>{exercices.length} exercice{exercices.length !== 1 ? "s" : ""}</Text>
          </View>

          {exercices.length === 0 ? (
            <EmptyState title="Aucun exercice" subtitle="Aucun exercice n'a encore été créé" />
          ) : (
            <>
              {pagedExercices.map((ex) => (
                <ExerciceCard
                  key={String(ex.id)}
                  exercice={ex}
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
          )}
        </ScrollView>
      )}

      {selectedExercice && !selectedSession && (
        <SessionsView exercice={selectedExercice} onSelectSession={setSelectedSession} />
      )}

      {selectedExercice && selectedSession && (
        <OperationsView session={selectedSession} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },

  // Header
  header:         { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, borderBottomLeftRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.xl },
  headerTop:      { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  backBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: SPACING.sm },
  headerTitle:    { fontSize: FONT_SIZES.lg, fontWeight: "700", color: "white" },
  headerSubtitle: { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  adminBadge:     { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.md, gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  adminBadgeText: { fontSize: 10, color: "white", fontWeight: "700" },

  // Breadcrumb
  breadcrumb: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: SPACING.xs, marginBottom: SPACING.xs },
  crumbItem:  { fontSize: FONT_SIZES.xs },
  crumbLink:  { color: "rgba(255,255,255,0.65)", fontWeight: "500" },
  crumbActive:{ color: "white", fontWeight: "700" },

  // Dashboard exercice
  dashboard:     { marginTop: SPACING.md },
  dashGrid:      { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  dashCard:      { width: "47%", borderRadius: BORDER_RADIUS.lg, overflow: "hidden" },
  dashCardInner: { padding: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", gap: 4 },
  dashIconWrap:  { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dashLabel:     { fontSize: 10, color: THEME.colors.neutral[600], fontWeight: "500" },
  dashValue:     { fontSize: FONT_SIZES.sm, fontWeight: "800" },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
  sectionTitle:  { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[700] },

  // Exercice card
  exerciceCard:      { marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.xl, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  exerciceCardInner: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  statusDot:         { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  exerciceIconBg:    { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  exerciceTextBlock: { flex: 1 },
  exerciceYear:      { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[800] },
  smallDate:         { fontSize: FONT_SIZES.xs, color: THEME.colors.neutral[500], marginTop: 4 },

  // Session card
  sessionCard:      { marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.xl, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  sessionCardInner: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  sessionIconBg:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  sessionTextBlock: { flex: 1 },
  sessionName:      { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[800] },

  // Badge partagé (statuts)
  badge:     { alignSelf: "flex-start", paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm, marginTop: 4 },
  badgeText: { fontSize: FONT_SIZES.xs, fontWeight: "700" },

  // Session summary (dans opérations)
  sessionSummary:       { marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.xl, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sessionSummaryInner:  { padding: SPACING.md, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  sessionSummaryHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
  sessionSummaryIcon:   { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sessionSummaryTitle:  { fontSize: FONT_SIZES.md, fontWeight: "700", color: THEME.colors.neutral[800] },
  summaryChip:          { alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.lg, gap: 2, minWidth: 110 },
  summaryChipLabel:     { fontSize: 10, fontWeight: "600", marginTop: 2 },
  summaryChipValue:     { fontSize: FONT_SIZES.xs, fontWeight: "800" },

  // Search
  searchContainer: { marginBottom: SPACING.md },
  searchBar:       { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", marginBottom: SPACING.xs },
  searchInput:     { flex: 1, marginLeft: SPACING.sm, fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[800] },
  filterToggle:    { padding: SPACING.xs },
  resultsCounter:  { fontSize: FONT_SIZES.xs, color: THEME.colors.neutral[500], textAlign: "center" },
  filterChip:      { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.85)", borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.sm, paddingVertical: 6, marginHorizontal: 3, borderWidth: 1, borderColor: THEME.colors.neutral[200], gap: 4 },
  filterChipActive:{ backgroundColor: THEME.colors.primary[500], borderColor: THEME.colors.primary[500] },
  filterChipText:  { fontSize: 11, fontWeight: "600", color: THEME.colors.neutral[600] },

  // Opération card
  opCard:       { borderRadius: BORDER_RADIUS.lg, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  opCardInner:  { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  opIcon:       { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  opContent:    { flex: 1 },
  opRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  opType:       { fontSize: FONT_SIZES.sm, fontWeight: "700", color: THEME.colors.neutral[800] },
  opDate:       { fontSize: 10, color: THEME.colors.neutral[500] },
  opAmount:     { fontSize: FONT_SIZES.md, fontWeight: "800", marginBottom: 3 },
  opMemberRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  opMember:     { fontSize: 11, color: THEME.colors.neutral[500] },
  opBadge:      { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 1, borderRadius: BORDER_RADIUS.xs },
  opBadgeText:  { fontSize: 9, fontWeight: "700" },

  // Pagination
  paginationBar:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.lg, marginVertical: SPACING.lg },
  pageBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: THEME.colors.neutral[200], elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  pageBtnDisabled: { opacity: 0.35 },
  pageLabel:       { fontSize: FONT_SIZES.sm, fontWeight: "600", color: THEME.colors.neutral[700] },

  // Modal
  modalBackdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet:       { maxHeight: SCREEN_HEIGHT * 0.82, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, overflow: "hidden" },
  modalContent:     { padding: SPACING.lg, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl },
  modalHandle:      { width: 40, height: 4, backgroundColor: THEME.colors.neutral[300], borderRadius: 2, alignSelf: "center", marginBottom: SPACING.lg },
  modalHeader:      { flexDirection: "row", alignItems: "center", marginBottom: SPACING.lg },
  modalHeaderIcon:  { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  modalTitle:       { fontSize: FONT_SIZES.lg, fontWeight: "700", color: THEME.colors.neutral[800] },
  modalSubtitle:    { fontSize: FONT_SIZES.xs, color: THEME.colors.neutral[500], marginTop: 2 },
  modalClose:       { padding: SPACING.xs },
  modalAmountBox:   { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, alignItems: "center" },
  modalAmountLabel: { fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[500], marginBottom: 4 },
  modalAmountValue: { fontSize: FONT_SIZES.xxl, fontWeight: "800" },
  detailRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  detailLabel:      { fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[600], fontWeight: "500" },
  detailValue:      { fontSize: FONT_SIZES.sm, color: THEME.colors.neutral[800], fontWeight: "600", textAlign: "right", flex: 1, marginLeft: SPACING.md },
});