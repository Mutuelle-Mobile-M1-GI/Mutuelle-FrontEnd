import React, { useState } from "react";
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
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAuthContext } from "../../context/AuthContext";
import { useAdminDashboard } from "../../hooks/useDashboard";
import { useMutuelleConfig } from "../../hooks/useConfig";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCurrentExercise, useCurrentSession } from "../../hooks/useExercise";
import { useCloseSession } from "../../hooks/useSession";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateNewSession, useUpdateSession, useDeleteSession } from "../../hooks/useSession";
import { useOperationsHistory, Operation } from "../../hooks/useOperationsHistory";
import { useExercises, useSessions } from "../../hooks/useListData";
import { useCaisseInscriptionCurrent } from "../../hooks/useInscription";
import { useUpdateExercise, useDeleteExercise } from "../../hooks/useExercise";
import { ExerciseEditModal } from "./ExerciseEditModal";
import { SessionEditModal } from "./SessionEditModal";
const { width } = Dimensions.get("window");

// 🎯 Configuration de la pagination
const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────
// 🔧 UTILITAIRES
// ─────────────────────────────────────────────

/**
 * Formate les erreurs API pour affichage lisible
 * Gère: { error: string, details: string }, { field: [messages] }, strings simples
 */
const formatErrorMessage = (error: any, defaultMessage: string = "Une erreur est survenue"): string => {
  if (!error?.response?.data) {
    return defaultMessage;
  }

  const errorData = error.response.data;

  // Format: { "error": "...", "details": "..." }
  if (errorData.error && errorData.details) {
    return `${errorData.error}\n\n${errorData.details}`;
  }

  if (errorData.error) {
    return errorData.error;
  }

  if (errorData.details) {
    return errorData.details;
  }

  // Format simple string
  if (typeof errorData === "string") {
    return errorData;
  }

  // Format: { field: [messages] } ou { field: message }
  if (typeof errorData === "object") {
    const messages = Object.entries(errorData)
      .map(([field, msgs]) => {
        const msgText = Array.isArray(msgs) ? msgs.join(", ") : msgs;
        return `${field}: ${msgText}`;
      })
      .join("\n");
    return messages || defaultMessage;
  }

  return defaultMessage;
};

// ─────────────────────────────────────────────
// 🎨 CONFIG TYPE D'OPÉRATION
// ─────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  INSCRIPTION:    { label: "Inscription",    color: "#4361EE", bg: "#4361EE15" },
  SOLIDARITE:     { label: "Solidarité",     color: "#38A3A5", bg: "#38A3A515" },
  AIDE:           { label: "Aide",           color: "#7209B7", bg: "#7209B715" },
  EMPRUNT:        { label: "Emprunt",        color: "#F77F00", bg: "#F77F0015" },
  REMBOURSEMENT:  { label: "Remboursement",  color: "#06A77D", bg: "#06A77D15" },
  EPARGNE:        { label: "Épargne",        color: "#B5179E", bg: "#B5179E15" },
};

// ─────────────────────────────────────────────
// 📄 PAGE HISTORIQUE (mini-modal interne au dashboard)
// Utilisée UNIQUEMENT pour les raccourcis soldes (Fond Social, Épargne…)
// ─────────────────────────────────────────────
interface HistoriquePageProps {
  visible: boolean;
  onClose: () => void;
  initialFilters?: string[];
  sessionId?: string | number | null;
  sessionNom?: string | null;
  title: string;
}

const HistoriquePage = ({
  visible,
  onClose,
  initialFilters = [],
  sessionId,
  sessionNom,
  title,
}: HistoriquePageProps) => {
  const [activeFilters, setActiveFilters] = useState<string[]>(initialFilters || []);
  const { data: operations = [], isLoading, error } = useOperationsHistory(sessionId);

  React.useEffect(() => {
    setActiveFilters(initialFilters);
  }, [visible]);

  const toggleFilter = (key: string | null) => {
    if (key === null) { setActiveFilters([]); return; }
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const filteredOps = operations.filter((op) => {
    const matchSession = sessionId ? String(op.session_id) === String(sessionId) : true;
    const matchType = activeFilters.length === 0 ? true : activeFilters.includes(op.type);
    return matchSession && matchType;
  });

  const FILTER_LIST = [
    { key: null,            label: "Toutes" },
    { key: "INSCRIPTION",   label: "Inscriptions" },
    { key: "SOLIDARITE",    label: "Solidarité" },
    { key: "AIDE",          label: "Aides" },
    { key: "EMPRUNT",       label: "Emprunts" },
    { key: "REMBOURSEMENT", label: "Remboursements" },
    { key: "EPARGNE",       label: "Épargne" },
  ];

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={hist.container}>
        <View style={hist.header}>
          <TouchableOpacity style={hist.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={hist.backBtnText}>Retour</Text>
          </TouchableOpacity>
          <Text style={hist.title}>{title}</Text>
          {sessionNom && <Text style={hist.subtitle}>{sessionNom}</Text>}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={hist.filtersRow}
          contentContainerStyle={hist.filtersContent}
        >
          {FILTER_LIST.map((f) => {
            const isActive = f.key === null ? activeFilters.length === 0 : activeFilters.includes(f.key);
            return (
              <TouchableOpacity
                key={String(f.key)}
                style={[hist.filterChip, isActive && hist.filterChipActive]}
                onPress={() => toggleFilter(f.key)}
              >
                <Text style={[hist.filterChipText, isActive && hist.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={hist.summary}>
          <Text style={hist.summaryText}>
            {filteredOps.length} opération{filteredOps.length > 1 ? "s" : ""}
          </Text>
          <Text style={hist.summaryAmount}>
            Total : {filteredOps.reduce((a, o) => a + o.montant, 0).toLocaleString("fr-FR")} FCFA
          </Text>
        </View>

        {isLoading ? (
          <View style={[hist.empty, { paddingTop: 100 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={hist.emptyText} numberOfLines={1}>
              Chargement des opérations...
            </Text>
          </View>
        ) : error ? (
          <View style={[hist.empty, { paddingTop: 100 }]}>
            <Ionicons name="alert-circle" size={48} color={COLORS.error} />
            <Text style={[hist.emptyText, { color: COLORS.error }]}>
              Erreur lors du chargement
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOps}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={hist.list}
            ListEmptyComponent={
              <View style={hist.empty}>
                <Text style={hist.emptyText}>Aucune opération trouvée</Text>
              </View>
            }
            renderItem={({ item }) => {
              const cfg = TYPE_CONFIG[item.type] || { label: item.type, color: "#666", bg: "#66666615" };
              return (
                <View style={hist.opCard}>
                  <View style={[hist.opTypeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[hist.opTypeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <View style={hist.opBody}>
                    <Text style={hist.opMembre}>{item.membre}</Text>
                    <Text style={hist.opDesc}>{item.description}</Text>
                    <Text style={hist.opDate}>{new Date(item.date).toLocaleDateString("fr-FR")}</Text>
                  </View>
                  <Text style={[hist.opMontant, { color: cfg.color }]}>
                    {item.montant.toLocaleString("fr-FR")} F
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL LISTE DES EXERCICES
// Clic sur un exercice → ouvre la liste des sessions de cet exercice
// ─────────────────────────────────────────────
interface ExerciceListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercice: (exe: any) => void;
  onEdit?: (exe: any) => void;
  onDelete?: (exe: any) => void;
  readOnly: boolean;

}

const ExerciceListModal = ({ visible, onClose, onSelectExercice, onEdit, onDelete, readOnly}: ExerciceListModalProps) => {
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const { data: exercicesRaw, isLoading, error } = useExercises();
  const exercices: any[] = Array.isArray(exercicesRaw) ? exercicesRaw : (exercicesRaw as any)?.results ?? [];

  const paginatedExercices = React.useMemo(
    () => exercices.slice(0, displayedItems),
    [exercices, displayedItems]
  );
  const hasMore = displayedItems < exercices.length;

  const loadMore = () => {
    setDisplayedItems((prev) => Math.min(prev + ITEMS_PER_PAGE, exercices.length));
  };

  const confirmDelete = (nom: string, onConfirm: () => void) => {
    Alert.alert("Confirmer la suppression", `Supprimer "${nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onConfirm },
    ]);
  };

  React.useEffect(() => {
    if (visible) setDisplayedItems(ITEMS_PER_PAGE);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={listModal.container}>
        <View style={listModal.header}>
          <TouchableOpacity onPress={onClose} style={listModal.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={listModal.title}>Liste des exercices</Text>
        </View>

        {isLoading ? (
          <View style={[listModal.list, { justifyContent: "center", alignItems: "center", paddingTop: 100 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={[listModal.list, { justifyContent: "center", alignItems: "center", paddingTop: 100 }]}>
            <Ionicons name="alert-circle" size={48} color={COLORS.error} />
            <Text style={[listModal.title, { color: COLORS.error, marginTop: SPACING.md }]}>Erreur de chargement</Text>
          </View>
        ) : exercices.length === 0 ? (
          <View style={[listModal.list, { justifyContent: "center", alignItems: "center", paddingTop: 100 }]}>
            <Text style={listModal.noItems}>Aucun exercice</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={listModal.list}>
            {paginatedExercices.map((exe: any) => (
              <View key={exe.id} style={listModal.block}>
                {/* Clic → ferme ce modal ET ouvre les sessions de l'exercice */}
                <TouchableOpacity
                  style={listModal.itemRow}
                  onPress={() => {
                    onClose();
                    onSelectExercice(exe);
                  }}
                >
                  <View style={listModal.itemLeft}>
                    <Text style={listModal.itemNom}>{exe.nom}</Text>
                    <Text style={listModal.itemDate}>
                      {new Date(exe.date_debut).toLocaleDateString("fr-FR")}
                    </Text>
                    <Text style={listModal.itemDate}>
                      {exe.date_fin
                        ? new Date(exe.date_fin).toLocaleDateString("fr-FR")
                        : "En cours"}
                    </Text>
                  </View>
                  <View
                    style={[
                      listModal.statusBadge,
                      { backgroundColor: exe.statut === "ACTIF" ? "#4361EE15" : "#66666615" },
                    ]}
                  >
                    <Text
                      style={[listModal.statusText, { color: exe.statut === "ACTIF" ? "#4361EE" : "#888" }]}
                    >
                      {exe.statut}
                    </Text>
                  </View>
                </TouchableOpacity>
                {!readOnly && (
                  <View style={listModal.actionRow}>
                    <TouchableOpacity
                      style={listModal.btnModifier}
                      onPress={() => onEdit && onEdit(exe)}
                    >
                      <Text style={listModal.btnModifierText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={listModal.btnSupprimer}
                      onPress={() => onDelete && onDelete(exe)}
                    >
                      <Text style={listModal.btnSupprimerText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {hasMore && (
              <TouchableOpacity style={listModal.loadMoreButton} onPress={loadMore}>
                <LinearGradient
                  colors={["#4361EE", "#3A86FF"]}
                  style={listModal.loadMoreGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={listModal.loadMoreText}>
                    Voir plus ({exercices.length - displayedItems} restant
                    {exercices.length - displayedItems > 1 ? "s" : ""})
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL LISTE DES SESSIONS
// • Mode "toutes"   : exerciceId = undefined  → titre "Toutes les sessions"
//                      affiche le nom de l'exercice dans chaque carte
// • Mode "exercice" : exerciceId = number     → titre dynamique "Sessions — <nom>"
//                      clic sur une session → navigation vers FinancialReportsScreen
// ─────────────────────────────────────────────
interface SessionListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: any) => void;
  exerciceId?: string;
  exerciceNom?: string;
  // Toutes les sessions : on a besoin des exercices pour afficher leur nom
  allExercices?: any[];
  onEdit?: (session: any) => void;
  onDelete?: (session: any) => void;
  readOnly: boolean;

}

const SessionListModal = ({
  visible,
  onClose,
  onSelectSession,
  exerciceId,
  exerciceNom,
  allExercices = [],
  onEdit,
  onDelete,
  readOnly,
}: SessionListModalProps) => {
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  // Si exerciceId fourni → sessions filtrées, sinon toutes les sessions
  const { data: sessionsRaw, isLoading, error } = useSessions(Number(exerciceId));
  const sessions: any[] = Array.isArray(sessionsRaw) ? sessionsRaw : (sessionsRaw as any)?.results ?? [];

  const paginatedSessions = React.useMemo(
    () => sessions.slice(0, displayedItems),
    [sessions, displayedItems]
  );
  const hasMore = displayedItems < sessions.length;

  const loadMore = () => {
    setDisplayedItems((prev) => Math.min(prev + ITEMS_PER_PAGE, sessions.length));
  };

  const confirmDelete = (nom: string, onConfirm: () => void) => {
    Alert.alert("Confirmer la suppression", `Supprimer "${nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onConfirm },
    ]);
  };

  React.useEffect(() => {
    if (visible) setDisplayedItems(ITEMS_PER_PAGE);
  }, [visible, exerciceId]);

  // Titre dynamique
  const modalTitle = exerciceId
    ? `Sessions — ${exerciceNom || "Exercice"}`
    : "Toutes les sessions";

  // Résolution du nom d'exercice pour le mode "toutes sessions"
  const getExerciceNomForSession = (sess: any): string | null => {
    if (exerciceId) return null; // mode exercice unique, pas besoin
    // Cherche d'abord dans les données de la session elle-même
    if (sess.exercice_nom) return sess.exercice_nom;
    if (sess.exercice_info?.nom) return sess.exercice_info.nom;
    // Cherche dans la liste des exercices passée en prop
    const found = allExercices.find((ex: any) => String(ex.id) === String(sess.exercice));
    return found?.nom ?? null;
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={listModal.container}>
        <View style={listModal.header}>
          <TouchableOpacity onPress={onClose} style={listModal.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={listModal.title}>{modalTitle}</Text>
        </View>

        {isLoading ? (
          <View style={[listModal.list, { justifyContent: "center", alignItems: "center", paddingTop: 100 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={[listModal.list, { justifyContent: "center", alignItems: "center", paddingTop: 100 }]}>
            <Ionicons name="alert-circle" size={48} color={COLORS.error} />
            <Text style={[listModal.title, { color: COLORS.error, marginTop: SPACING.md }]}>Erreur de chargement</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={[listModal.list, { justifyContent: "center", alignItems: "center", paddingTop: 100 }]}>
            <Text style={listModal.noItems}>Aucune session</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={listModal.list}>
            {paginatedSessions.map((sess: any) => {
              const exNom = getExerciceNomForSession(sess);
              return (
                <View key={sess.id} style={listModal.block}>
                  <TouchableOpacity
                    style={listModal.itemRow}
                    onPress={() => {
                      onClose();
                      onSelectSession(sess);
                    }}
                  >
                    <View style={listModal.itemLeft}>
                      <Text style={listModal.itemNom}>{sess.nom}</Text>
                      <Text style={listModal.itemDate}>
                        {new Date(sess.date_session).toLocaleDateString("fr-FR")}
                      </Text>
                      {/* Nom de l'exercice affiché seulement en mode "toutes sessions" */}
                      {exNom && (
                        <View style={listModal.exerciceBadge}>
                          <Ionicons name="calendar-outline" size={11} color="#4361EE" />
                          <Text style={listModal.exerciceBadgeText}>{exNom}</Text>
                        </View>
                      )}
                      <Text style={listModal.itemDate}>
                        {sess.nombre_membres_inscrits ?? 0} membres inscrits
                      </Text>
                    </View>
                    <View
                      style={[
                        listModal.statusBadge,
                        {
                          backgroundColor:
                            sess.statut === "ACTIVE" || sess.statut === "EN_COURS"
                              ? "#38A3A515"
                              : "#66666615",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          listModal.statusText,
                          {
                            color:
                              sess.statut === "ACTIVE" || sess.statut === "EN_COURS"
                                ? "#38A3A5"
                                : "#888",
                          },
                        ]}
                      >
                        {sess.statut}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {!readOnly && (
                    <View style={listModal.actionRow}>
                      <TouchableOpacity
                        style={listModal.btnModifier}
                        onPress={() => onEdit && onEdit(sess)}
                      >
                        <Text style={listModal.btnModifierText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={listModal.btnSupprimer}
                        onPress={() => onDelete && onDelete(sess)}
                      >
                        <Text style={listModal.btnSupprimerText}>Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
              );
            })}

            {hasMore && (
              <TouchableOpacity style={listModal.loadMoreButton} onPress={loadMore}>
                <LinearGradient
                  colors={["#38A3A5", "#57CC99"]}
                  style={listModal.loadMoreGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={listModal.loadMoreText}>
                    Voir plus ({sessions.length - displayedItems} restant
                    {sessions.length - displayedItems > 1 ? "s" : ""})
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL NOUVELLE SESSION
// ─────────────────────────────────────────────
interface NewSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}

const NewSessionModal = ({ visible, onClose, onSubmit, loading }: NewSessionModalProps) => {
  const [formData, setFormData] = useState({
    nom: "",
    date_session: new Date().toISOString().split("T")[0],
    montant_collation: "45000",
    montant_autre_depense: "",
    motif_autre_depense: "",
  });

  // Réinitialiser le formulaire à chaque ouverture
  React.useEffect(() => {
    if (visible) {
      setFormData({
        nom: "",
        date_session: new Date().toISOString().split("T")[0],
        montant_collation: "45000",
        montant_autre_depense: "",
        motif_autre_depense: "",
      });
    }
  }, [visible]);

  const hasDepense = formData.montant_autre_depense.trim() !== "";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.modalContent}>
          {/* ── En-tête ── */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle Session</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Section infos session ── */}
            <Text style={styles.inputLabel}>Nom de la session</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Session Janvier 2025"
              value={formData.nom}
              onChangeText={(text) => setFormData({ ...formData, nom: text })}
            />

            <Text style={styles.inputLabel}>Date de session</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.date_session}
              onChangeText={(text) => setFormData({ ...formData, date_session: text })}
            />

            <Text style={styles.inputLabel}>Montant collation (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="45000"
              value={formData.montant_collation}
              onChangeText={(text) => setFormData({ ...formData, montant_collation: text })}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Montant par défaut : 45 000 FCFA</Text>

            {/* ── Séparateur section dépense ── */}
            <View style={styles.sectionDivider}>
              <View style={styles.sectionDividerLine} />
              <View style={styles.sectionDividerBadge}>
                <Ionicons name="receipt-outline" size={13} color="#F97316" />
                <Text style={styles.sectionDividerText}>Dépense supplémentaire</Text>
              </View>
              <View style={styles.sectionDividerLine} />
            </View>

            <Text style={styles.sectionHint}>
              Facultatif : Remplir ce champ uniquement si une dépense est associée à cette session.
            </Text>

            <Text style={styles.inputLabel}>Montant de la dépense (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10 000"
              value={formData.montant_autre_depense}
              onChangeText={(text) => setFormData({ ...formData, montant_autre_depense: text })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, !hasDepense && styles.inputLabelDisabled]}>
              Motif / Description
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, !hasDepense && styles.inputDisabled]}
              placeholder="Ex: Achat fournitures, location salle . . ."
              value={formData.motif_autre_depense}
              onChangeText={(text) => setFormData({ ...formData, motif_autre_depense: text })}
              multiline
              numberOfLines={3}
              editable={hasDepense}
            />
            {hasDepense && formData.motif_autre_depense.trim() === "" && (
              <Text style={styles.warningText}>
                ⚠ Veuillez renseigner un motif pour cette dépense.
              </Text>
            )}

            <View style={{ height: SPACING.md }} />
          </ScrollView>

          {/* ── Boutons ── */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || (hasDepense && formData.motif_autre_depense.trim() === "")) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={() => onSubmit(formData)}
              disabled={loading || (hasDepense && formData.motif_autre_depense.trim() === "")}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Créer Session</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 🏠 ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────
export default function AdminDashboardScreen() {
const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const readOnly = !user?.can_write; // true pour Trésorier et Président

  const { data: dashboardData, isLoading, error, refetch } = useAdminDashboard();
  const { data: config } = useMutuelleConfig();
  const queryClient = useQueryClient();
  const createSessionMutation = useCreateNewSession();
  
  // ✅ Mutations pour modifier et supprimer exercices
  const updateExerciseMutation = useUpdateExercise();
  const deleteExerciseMutation = useDeleteExercise();
  
  // ✅ Mutations pour modifier et supprimer sessions
  const updateSessionMutation = useUpdateSession();
  const deleteSessionMutation = useDeleteSession();
  const closeSessionMutation = useCloseSession(); // 🏁 Clore une session

  // ── Données exercices (pour enrichir les cartes de sessions en mode "toutes") ──
  const { data: allExercicesRaw } = useExercises();
  const allExercices: any[] = Array.isArray(allExercicesRaw) ? allExercicesRaw : (allExercicesRaw as any)?.results ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Modal liste exercices
  const [showExerciceModal, setShowExerciceModal] = useState(false);

  // Modal liste sessions — mode "toutes" (bouton Session du dashboard)
  const [showAllSessionsModal, setShowAllSessionsModal] = useState(false);

  // Modal liste sessions — mode "exercice" (clic sur un exercice dans la liste)
  const [selectedExercice, setSelectedExercice] = useState<any>(null);
  const [showSessionsForExercice, setShowSessionsForExercice] = useState(false);

  // ✅ Modal de modification d'exercice
  const [exerciseEditModalVisible, setExerciseEditModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);

  // ✅ Modal de modification de session
  const [sessionEditModalVisible, setSessionEditModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  // Mini-historique interne (raccourcis soldes)
  const [historiqueVisible, setHistoriqueVisible] = useState(false);
  const [historiqueFilters, setHistoriqueFilters] = useState<string[]>([]);
  const [historiqueSession, setHistoriqueSession] = useState<any>(null);
  const [historiqueTitle, setHistoriqueTitle] = useState("Historique des opérations");

  const sessionLoading = createSessionMutation.isPending;
  const { data: currentExercise, isLoading: exerciseLoading, error: exerciseError } = useCurrentExercise();
  const { data: currentSession, isLoading: sessionLoading2, error: sessionError } = useCurrentSession();
  const { data: caisseInscription, error: caisseInscriptionError } = useCaisseInscriptionCurrent();

  // ⚠️ Condition pour vérifier s'il n'y a vraiment pas de données en cours
  // (éviter d'afficher les données du cache quand l'API retourne "Aucun")
  const hasCurrentExercise = currentExercise && !exerciseError?.message?.includes("NO_");
  const hasCurrentSession = currentSession && !sessionError?.message?.includes("NO_");
  const hasCaisseInscription = caisseInscription && !caisseInscriptionError?.message?.includes("NO_");
  
  
  // Label du rôle affiché dans le header
  const roleLabel =
    user?.role === "SECRETAIRE_GENERALE" ? "Secrétaire Générale"
    : user?.role === "TRESORIER"         ? "Trésorier"
    : user?.role === "PRESIDENT"         ? "Président"
    : "Membre";
  
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          await refetch();
          queryClient.invalidateQueries({ queryKey: ["current-user"] });
          queryClient.invalidateQueries({ queryKey: ["current-exercise"] });
          queryClient.invalidateQueries({ queryKey: ["current-session"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["tresor"] });
          queryClient.invalidateQueries({ queryKey: ["fonds-social"] });
          queryClient.invalidateQueries({ queryKey: ["caisse-inscription-current"] });
        } catch (err) {
          console.error("Erreur lors du refresh du dashboard:", err);
        }
      };
      refreshData();
    }, [refetch, queryClient])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["current-exercise"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tresor"] });
      queryClient.invalidateQueries({ queryKey: ["fonds-social"] });
      queryClient.invalidateQueries({ queryKey: ["caisse-inscription-current"] });
    } finally {
      setRefreshing(false);
    }
  };

  // Ouvrir le mini-historique interne (raccourcis soldes uniquement)
  const openHistorique = (title: string, filters: string[] = [], session: any = null) => {
    setHistoriqueTitle(title);
    setHistoriqueFilters(filters);
    setHistoriqueSession(session);
    setHistoriqueVisible(true);
  };

  // ── Navigation vers FinancialReportsScreen avec pré-sélection session ──
  // IMPORTANT : on passe les IDs en NUMBER (pas en string) pour correspondre
  // exactement aux comparaisons === faites dans FinancialReportsScreen.
  const handleSelectSession = (sess: any) => {
    // Fermer tous les modals ouverts
    setShowAllSessionsModal(false);
    setShowSessionsForExercice(false);
    setShowExerciceModal(false);

    // Les IDs sont des UUID (strings) — on les passe tels quels, sans Number()
    const exerciceId: string =
      typeof sess.exercice === "object"
        ? String(sess.exercice?.id ?? "")
        : String(sess.exercice ?? "");

    // Résoudre le nom de l'exercice
    const exerciceNom =
      sess.exercice_nom ||
      sess.exercice_info?.nom ||
      allExercices.find((ex: any) => String(ex.id) === exerciceId)?.nom ||
      "";

    navigation.navigate("Historique" as never, {
      sessionId:    String(sess.id),    // ← UUID string
      exerciceId:   exerciceId,         // ← UUID string
      sessionName:  sess.nom,
      exerciceName: exerciceNom,
    } as never);
  };

  // ✅ Handlers pour la modification d'exercice
  const handleOpenEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    setExerciseEditModalVisible(true);
  };

  const handleSubmitEditExercise = async (data: any) => {
    if (!editingExercise?.id) return;
    
    try {
      await updateExerciseMutation.mutateAsync({
        exerciseId: editingExercise.id,
        exerciseData: {
          nom: data.nom,
          date_debut: data.date_debut,
          date_fin: data.date_fin || null,
          description: data.description,
        },
      });
      Alert.alert("Succès", "Exercice modifié avec succès !");
      setExerciseEditModalVisible(false);
      setEditingExercise(null);
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Impossible de modifier l'exercice");
      Alert.alert("Erreur", errorMessage);
    }
  };

  const handleDeleteExercise = (exercise: any) => {
    Alert.alert(
      "Confirmation",
      `Êtes-vous sûr de vouloir supprimer l'exercice "${exercise.nom}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExerciseMutation.mutateAsync(exercise.id);
              Alert.alert("Succès", "Exercice supprimé avec succès !");
              queryClient.invalidateQueries({ queryKey: ["exercises"] });
            } catch (error: any) {
              const errorMessage = formatErrorMessage(error, "Impossible de supprimer l'exercice");
              Alert.alert("Erreur", errorMessage);
            }
          },
        },
      ]
    );
  };

  // ✅ Handlers pour la modification de session
  const handleOpenEditSession = (session: any) => {
    setEditingSession(session);
    setSessionEditModalVisible(true);
  };

  const handleSubmitEditSession = async (data: any) => {
    if (!editingSession?.id) return;
    
    try {
      await updateSessionMutation.mutateAsync({
        sessionId: editingSession.id,
        sessionData: {
          nom: data.nom,
          date_session: data.date_session,
          montant_collation: data.montant_collation,
          description: data.description,
        },
      });
      Alert.alert("Succès", "Session modifiée avec succès !");
      setSessionEditModalVisible(false);
      setEditingSession(null);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Impossible de modifier la session");
      Alert.alert("Erreur", errorMessage);
    }
  };

  const handleDeleteSession = (session: any) => {
    Alert.alert(
      "Confirmation",
      `Êtes-vous sûr de vouloir supprimer la session "${session.nom}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSessionMutation.mutateAsync(session.id);
              Alert.alert("Succès", "Session supprimée avec succès !");
              queryClient.invalidateQueries({ queryKey: ["sessions"] });
            } catch (error: any) {
              const errorMessage = formatErrorMessage(error, "Impossible de supprimer la session");
              Alert.alert("Erreur", errorMessage);
            }
          },
        },
      ]
    );
  };

  /*const handleCreateSession = async (sessionData: any) => {
    try {
      const apiData = {
        nom: sessionData.nom.trim(),
        date_session: sessionData.date_session,
        montant_collation: parseFloat(sessionData.montant_collation) || 45000,
        description: `Session créée le ${new Date().toLocaleDateString("fr-FR")}`,
        exercice: currentExercise?.id,
      };
      await createSessionMutation.mutateAsync(apiData);
      Alert.alert("Succès", "Session créée avec succès !");
      setShowSessionModal(false);
    } catch (error: any) {
      let errorMessage = "Impossible de créer la session";
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object") {
          errorMessage = Object.entries(errorData)
            .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(", ") : m}`)
            .join("\n");
        }
      }
      Alert.alert("Erreur", errorMessage);
    }
  };*/

  const handleCreateSession = async (sessionData: any) => {
    // ⚠️ Vérifier qu'on a vraiment un exercice en cours
    if (!hasCurrentExercise) {
      Alert.alert("Erreur", "Aucun exercice n'est actuellement ouvert. Veuillez d'abord créer un exercice.");
      return;
    }

    try {
      const montantDepense = parseFloat(sessionData.montant_autre_depense) || 0;
      const hasDepense     = montantDepense > 0;
 
      const apiData: any = {
        nom:              sessionData.nom.trim(),
        date_session:     sessionData.date_session,
        montant_collation: parseFloat(sessionData.montant_collation) || 45000,
        description:      `Session créée le ${new Date().toLocaleDateString("fr-FR")}`,
        exercice:         currentExercise?.id,
      };
 
      // N'envoyer les champs dépense que si un montant est saisi
      if (hasDepense) {
        apiData.montant_autre_depense = montantDepense;
        apiData.motif_autre_depense   = sessionData.motif_autre_depense.trim();
      }
 
      await createSessionMutation.mutateAsync(apiData);
      Alert.alert("Succès", "Session créée avec succès !");
      setShowSessionModal(false);
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Impossible de créer la session");
      Alert.alert("Erreur", errorMessage);
    }
  };

  // 🏁 Handler pour clore la session actuelle
  const handleCloseSession = async () => {
    if (!currentSession?.id) return;
    
    Alert.alert(
      "Confirmation",
      `Êtes-vous sûr de vouloir terminer la session "${currentSession.nom}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Terminer",
          style: "destructive",
          onPress: async () => {
            try {
              await closeSessionMutation.mutateAsync(currentSession.id);
              Alert.alert("Succès", "Session terminée avec succès !");
            } catch (error: any) {
              const errorMessage = formatErrorMessage(error, "Impossible de terminer la session");
              Alert.alert("Erreur", errorMessage);
            }
          },
        },
      ]
    );
  };

  const stats = React.useMemo(() => {
    if (!dashboardData) return null;
    return {
      fondInscription: hasCaisseInscription ? (parseFloat(caisseInscription?.montant_total || "0") || 0) : 0,
      fondSocial: dashboardData.fonds_social?.montant_total || 0,
      fondEpargne: dashboardData.tresor?.cumul_total_epargnes || 0,
      membres: dashboardData.tresor?.nombre_membres || 0,
      empruntsEnCours: dashboardData.emprunts_en_cours?.nombre || 0,
      alertesCount: dashboardData.alertes?.length || 0,
    };
  }, [dashboardData, caisseInscription, caisseInscriptionError]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorText}>
          Impossible de charger les données du tableau de bord
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName =
    user?.nom_complet ||
    (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Utilisateur";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══ HEADER FIGÉ ══ */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Bonjour </Text>
          <Text style={styles.userName}>{userName}</Text>
          {/* ✅ Affiche le vrai rôle */}
          <Text style={styles.userRole}>{roleLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            {(stats?.alertesCount || 0) > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {(stats?.alertesCount || 0) > 9 ? "9+" : stats?.alertesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ CONTENU SCROLLABLE ══ */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ SOLDE DES COMPTES ══ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solde des comptes</Text>

          <TouchableOpacity
            style={styles.soldeCard}
            // onPress={() =>
            //   navigation.navigate("Historique" as never, {
            //     filterPreset: ["paiement-inscription"],
            //   } as never)
            // }
            activeOpacity={0.8}
          >
            <View style={styles.soldeLeft}>
              <View style={[styles.soldeIconWrapper, { backgroundColor: "#4361EE20" }]}>
                <Ionicons name="person-add" size={22} color="#4361EE" />
              </View>
              <View>
                <Text style={styles.soldeMontant}>
                  {(stats?.fondInscription || 0).toLocaleString("fr-FR")} Fcfa
                </Text>
                <Text style={styles.soldeLabel}>Fond Inscription</Text>
              </View>
            </View>
            {/* <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /> */}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.soldeCard}
            // onPress={() =>
            //   navigation.navigate("Historique" as never, {
            //     filterPreset: ["solidarite", "renflouement", "assistance"],
            //   } as never)
            // }
            activeOpacity={0.8}
          >
            <View style={styles.soldeLeft}>
              <View style={[styles.soldeIconWrapper, { backgroundColor: "#38A3A520" }]}>
                <Ionicons name="heart" size={22} color="#38A3A5" />
              </View>
              <View>
                <Text style={styles.soldeMontant}>
                  {(stats?.fondSocial || 0).toLocaleString("fr-FR")} Fcfa
                </Text>
                <Text style={styles.soldeLabel}>Fond Social</Text>
              </View>
            </View>
            {/* <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /> */}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.soldeCard}
            // onPress={() =>
            //   navigation.navigate("Historique" as never, {
            //     filterPreset: ["epargne", "remboursement", "emprunt"],
            //   } as never)
            // }
            activeOpacity={0.8}
          >
            <View style={styles.soldeLeft}>
              <View style={[styles.soldeIconWrapper, { backgroundColor: "#B5179E20" }]}>
                <Ionicons name="wallet" size={22} color="#B5179E" />
              </View>
              <View>
                <Text style={styles.soldeMontant}>
                  {(stats?.fondEpargne || 0).toLocaleString("fr-FR")} Fcfa
                </Text>
                <Text style={styles.soldeLabel}>Fond Épargne</Text>
              </View>
            </View>
            {/* <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} /> */}
          </TouchableOpacity>
        </View>

        {/* ══ EXERCICE & SESSION ══ */}
        <View style={styles.exerciseSessionContainer}>
          <Text style={styles.sectionTitle}>Exercices & Sessions en cours</Text>
          <View style={styles.exerciseSessionGrid}>

            {/* Bouton Exercice → ouvre la liste des exercices */}
            <TouchableOpacity
              style={[styles.exerciseSessionCard, { backgroundColor: "#4361EE15" }]}
              onPress={() => setShowExerciceModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="calendar" size={20} color="#4361EE" />
                <Text style={[styles.cardTitle, { color: "#4361EE" }]}>Exercice</Text>
                <Ionicons name="chevron-forward" size={16} color="#4361EE" style={{ marginLeft: "auto" }} />
              </View>
              {exerciseLoading ? (
                <ActivityIndicator size="small" color="#4361EE" />
              ) : hasCurrentExercise ? (
                <View style={styles.cardContent}>
                 <Text style={styles.cardMainText}>{currentExercise.nom}</Text>
                  <Text style={styles.cardSubText}>
                    {new Date(currentExercise.date_debut).toLocaleDateString("fr-FR")} -{" "}
                    {currentExercise.date_fin
                      ? new Date(currentExercise.date_fin).toLocaleDateString("fr-FR")
                      : "En cours"}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusBadgeText, { color: "#4361EE" }]}>
                      {currentExercise.statut}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.cardEmptyText}>Aucun exercice en cours</Text>
              )}
            </TouchableOpacity>

            {/* Bouton Session → ouvre TOUTES les sessions */}
            <TouchableOpacity
              style={[styles.exerciseSessionCard, { backgroundColor: "#38A3A515" }]}
              onPress={() => setShowAllSessionsModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={20} color="#38A3A5" />
                <Text style={[styles.cardTitle, { color: "#38A3A5" }]}>Session</Text>
                <Ionicons name="chevron-forward" size={16} color="#38A3A5" style={{ marginLeft: "auto" }} />
              </View>
              {sessionLoading2 ? (
                <ActivityIndicator size="small" color="#38A3A5" />
              ) : hasCurrentSession ? (
                <View style={styles.cardContent}>
                  <Text style={styles.cardMainText}>{currentSession.nom}</Text>
                  <Text style={styles.cardSubText}>
                    {new Date(currentSession.date_session).toLocaleDateString("fr-FR")}
                  </Text>
                  <View style={styles.sessionStats}>
                    <Text style={styles.sessionStatsText}>
                      {currentSession.nombre_membres_inscrits || 0} membres
                    </Text>
                    <Text style={styles.sessionStatsText}>
                      {(currentSession.total_solidarite_collectee || 0).toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={styles.cardEmptyText}>Aucune session active</Text>
                  {!readOnly && (
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => setShowSessionModal(true)}
                    >
                      <Text style={styles.createButtonText}>Créer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* ══ MODULES ══ */}
        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>Gestion Mutuelle</Text>
          <View style={styles.modulesGrid}>
            {[
              { id: "inscriptions",   title: "Membres",        subtitle: "Gérer les inscriptions des Membres", icon: "person-add", gradientColors: ["#4361EE", "#3A86FF"] as [string, string], route: "InscriptionsScreen" },
              { id: "solidarite",     title: "Solidarité",     subtitle: "Fonds social",                       icon: "heart",      gradientColors: ["#38A3A5", "#57CC99"] as [string, string], route: "SolidarityScreen" },
              { id: "epargne",        title: "Épargne",        subtitle: "Gestion des épargnes",               icon: "wallet",     gradientColors: ["#B5179E", "#F72585"] as [string, string], route: "SavingsScreen" },
              { id: "emprunts",       title: "Emprunts",       subtitle: "Prêts et crédits",                   icon: "card",       gradientColors: ["#F77F00", "#FCBF49"] as [string, string], route: "LoansScreen" },
              { id: "assistances",    title: "Assistances",    subtitle: "Aides et soutiens",                  icon: "medical",    gradientColors: ["#7209B7", "#A663CC"] as [string, string], route: "AssistanceScreen" },
              { id: "remboursements", title: "Remboursements", subtitle: "Suivi des retours",                  icon: "repeat",     gradientColors: ["#06FFA5", "#0EAD69"] as [string, string], route: "RepaymentsScreen" },
            ].map((module) => (
              <TouchableOpacity
                key={module.id}
                style={styles.moduleCard}
                onPress={() => navigation.navigate(module.route)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={module.gradientColors}
                  style={styles.moduleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.moduleContent}>
                    <Ionicons name={module.icon as any} size={28} color="white" />
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══ BOUTON NOUVELLE SESSION / TERMINER SESSION ══ */}
        {!readOnly && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.newSessionButton}
              onPress={() => {
                if (hasCurrentSession) {
                  handleCloseSession();
                } else {
                  setShowSessionModal(true);
                }
              }}
            activeOpacity={0.9}
          >
            <LinearGradient
                colors={hasCurrentSession ? ["#CC0000", "#FF6666"] : ["#4361EE", "#3A86FF"]}
              style={styles.newSessionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
                <Ionicons name={hasCurrentSession ? "stop-circle" : "add-circle"} size={24} color="white" />
                <Text style={styles.newSessionText}>
                  {hasCurrentSession ? "Terminer la session" : "Nouvelle Session"}
                </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        )}

        {/* ══ ALERTES ══ */}
        {dashboardData?.alertes && dashboardData.alertes.length > 0 && (
          <View style={styles.alertsContainer}>
            <Text style={styles.sectionTitle}>Alertes</Text>
            {dashboardData.alertes.slice(0, 3).map((alerte: any, index: number) => (
              <View key={index} style={styles.alertCard}>
                <Ionicons
                  name={alerte.priorite === "HAUTE" ? "warning" : "information-circle"}
                  size={20}
                  color={alerte.priorite === "HAUTE" ? COLORS.error : COLORS.warning}
                />
                <Text style={styles.alertText}>{alerte.message}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ══════════ MODALS ══════════ */}

      {/* Nouvelle session */}
      {!readOnly && (
        <>
          <NewSessionModal
            visible={showSessionModal}
            onClose={() => setShowSessionModal(false)}
            onSubmit={handleCreateSession}
            loading={sessionLoading}
          />

          {/* ✅ Modification d'exercice */}
          <ExerciseEditModal
            visible={exerciseEditModalVisible}
            onClose={() => {
              setExerciseEditModalVisible(false);
              setEditingExercise(null);
            }}
            onSubmit={handleSubmitEditExercise}
            initialData={editingExercise}
            loading={updateExerciseMutation.isPending}
            isEditing={true}
          />

          {/* ✅ Modification de session */}
          <SessionEditModal
            visible={sessionEditModalVisible}
            onClose={() => {
              setSessionEditModalVisible(false);
              setEditingSession(null);
            }}
            onSubmit={handleSubmitEditSession}
            initialData={editingSession}
            loading={updateSessionMutation.isPending}
            isEditing={true}
          />
        </>
      )}
      {/* Liste des exercices (clic sur exercice → ouvre sessions de cet exercice) */}
      <ExerciceListModal
        visible={showExerciceModal}
        onClose={() => setShowExerciceModal(false)}
        onSelectExercice={(exe) => {
          setSelectedExercice(exe);
          setShowSessionsForExercice(true);
        }}
        onEdit={handleOpenEditExercise}
        onDelete={handleDeleteExercise}
        readOnly={readOnly}
      />

      {/* Toutes les sessions (bouton "Session" du dashboard) */}
      <SessionListModal
        visible={showAllSessionsModal}
        onClose={() => setShowAllSessionsModal(false)}
        onSelectSession={handleSelectSession}
        allExercices={allExercices}
        onEdit={handleOpenEditSession}
        onDelete={handleDeleteSession}
        readOnly={readOnly}
        // pas d'exerciceId → toutes les sessions
      />

      {/* Sessions filtrées par exercice (après clic exercice dans la liste) */}
      <SessionListModal
        visible={showSessionsForExercice}
        onClose={() => setShowSessionsForExercice(false)}
        onSelectSession={handleSelectSession}
        exerciceId={selectedExercice?.id}
        exerciceNom={selectedExercice?.nom}
        allExercices={allExercices}
        onEdit={handleOpenEditSession}
        onDelete={handleDeleteSession}
        readOnly={readOnly}
      />

      {/* Mini-historique interne (raccourcis soldes uniquement) */}
      <HistoriquePage
        visible={historiqueVisible}
        onClose={() => setHistoriqueVisible(false)}
        initialFilters={historiqueFilters}
        sessionId={historiqueSession?.id}
        sessionNom={historiqueSession?.nom}
        title={historiqueTitle}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// 🎨 STYLES PRINCIPAUX
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xxl },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  loadingText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.md },

  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg },
  errorTitle: { fontSize: FONT_SIZES.xl, fontWeight: "bold", color: COLORS.error, marginTop: SPACING.md, marginBottom: SPACING.sm },
  errorText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.lg },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md },
  retryButtonText: { color: "white", fontWeight: "600", fontSize: FONT_SIZES.md },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, marginTop: SPACING.lg, backgroundColor: COLORS.background },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  userName: { fontSize: FONT_SIZES.xxl, fontWeight: "bold", color: COLORS.text, marginBottom: SPACING.xs },
  userRole: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: "500" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", position: "relative" },
  notificationBadge: { position: "absolute", top: -2, right: -2, backgroundColor: COLORS.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center" },
  notificationBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "white", fontSize: FONT_SIZES.md, fontWeight: "bold" },

  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: COLORS.text, marginBottom: SPACING.md },

  soldeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  soldeLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  soldeIconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  soldeMontant: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: COLORS.text },
  soldeLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  exerciseSessionContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  exerciseSessionGrid: { flexDirection: "row", gap: SPACING.md },
  exerciseSessionCard: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZES.sm, fontWeight: "600" },
  cardContent: { flex: 1 },
  cardMainText: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: COLORS.text, marginBottom: SPACING.xs },
  cardSubText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  cardEmptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, textAlign: "center", marginBottom: SPACING.sm },
  statusBadge: { alignSelf: "flex-start", backgroundColor: "#4361EE15", paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm },
  statusBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: "500" },
  sessionStats: { flexDirection: "row", justifyContent: "space-between" },
  sessionStatsText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: "500" },
  createButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, alignSelf: "center" },
  createButtonText: { fontSize: FONT_SIZES.xs, color: "white", fontWeight: "600" },

  modulesContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  modulesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: SPACING.md },
  moduleCard: { width: (width - SPACING.lg * 2 - SPACING.md) / 2, height: 140, borderRadius: BORDER_RADIUS.xl, overflow: "hidden", marginBottom: SPACING.md },
  moduleGradient: { flex: 1, padding: SPACING.md, justifyContent: "center" },
  moduleContent: { alignItems: "center" },
  moduleTitle: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: "white", marginTop: SPACING.sm, textAlign: "center" },
  moduleSubtitle: { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.8)", marginTop: SPACING.xs, textAlign: "center" },

  actionContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  newSessionButton: { borderRadius: BORDER_RADIUS.xl, overflow: "hidden", shadowColor: COLORS.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  newSessionGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  newSessionText: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: "white" },

  alertsContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  alertCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  alertText: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginLeft: SPACING.sm, flex: 1 },

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.xl, width: width - SPACING.lg * 2, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: COLORS.text },
  modalBody: { padding: SPACING.lg },
  inputLabel: { fontSize: FONT_SIZES.md, fontWeight: "500", color: COLORS.text, marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.text, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  helperText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  modalActions: { flexDirection: "row", padding: SPACING.lg, gap: SPACING.md },
  cancelButton: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, alignItems: "center" },
  cancelButtonText: { fontSize: FONT_SIZES.md, fontWeight: "500", color: COLORS.textSecondary },
  submitButton: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center" },
  submitButtonDisabled: { backgroundColor: COLORS.textLight },
  submitButtonText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: "white" },

  // Section dépense
  sectionDivider:      { flexDirection: "row", alignItems: "center", marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionDividerLine:  { flex: 1, height: 1, backgroundColor: COLORS.border },
  sectionDividerBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFF7ED", paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 20, marginHorizontal: SPACING.sm },
  sectionDividerText:  { fontSize: FONT_SIZES.xs, fontWeight: "700", color: "#F97316" },
  sectionHint:         { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.md, fontStyle: "italic" },
  inputMultiline:      { minHeight: 72, textAlignVertical: "top", paddingTop: SPACING.sm },
  inputDisabled:       { backgroundColor: COLORS.border, color: COLORS.textLight },
  inputLabelDisabled:  { color: COLORS.textLight },
  warningText:         { fontSize: FONT_SIZES.xs, color: "#F97316", marginTop: -SPACING.sm, marginBottom: SPACING.sm },
});

// ─────────────────────────────────────────────
// 🎨 STYLES MODALS LISTE (exercices & sessions)
// ─────────────────────────────────────────────
const listModal = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 10, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.md },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: COLORS.text },
  list: { padding: SPACING.lg },

  block: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: "hidden" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: SPACING.md },
  itemLeft: { flex: 1, paddingRight: SPACING.sm },
  itemNom: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  itemDate: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 2 },

  // Badge nom d'exercice dans les cartes session (mode "toutes sessions")
  exerciceBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, backgroundColor: "#4361EE10", paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm, alignSelf: "flex-start" },
  exerciceBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: "600", color: "#4361EE" },

  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, alignSelf: "flex-start" },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  btnModifier: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: "#4361EE", alignItems: "center" },
  btnModifierText: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: "white" },
  btnSupprimer: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: "#CC0000", alignItems: "center" },
  btnSupprimerText: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: "white" },

  noItems: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, padding: SPACING.md, fontStyle: "italic" },

  loadMoreButton: { marginTop: SPACING.lg, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: "hidden", elevation: 3, shadowColor: COLORS.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  loadMoreGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: SPACING.sm },
  loadMoreText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: "white" },
});

// ─────────────────────────────────────────────
// 🎨 STYLES PAGE HISTORIQUE (mini-modal interne)
// ─────────────────────────────────────────────
const hist = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 10, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: SPACING.sm },
  backBtnText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: "600" },
  title: { fontSize: FONT_SIZES.xl, fontWeight: "bold", color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },

  filtersRow: { borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 56 },
  filtersContent: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm, flexDirection: "row", alignItems: "center" },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: "500" },
  filterChipTextActive: { color: "white" },

  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  summaryAmount: { fontSize: FONT_SIZES.sm, fontWeight: "700", color: COLORS.text },

  list: { padding: SPACING.lg },
  opCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm, marginBottom: SPACING.sm },
  opTypeBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, minWidth: 90, alignItems: "center" },
  opTypeText: { fontSize: FONT_SIZES.xs, fontWeight: "700" },
  opBody: { flex: 1 },
  opMembre: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  opDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 2 },
  opDate: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  opMontant: { fontSize: FONT_SIZES.sm, fontWeight: "700" },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textLight, fontStyle: "italic" },
});