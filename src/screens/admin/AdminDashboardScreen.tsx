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
import { useQueryClient } from "@tanstack/react-query";
import { useCreateNewSession } from "../../hooks/useSession";

const { width } = Dimensions.get("window");

// 🎯 Configuration de la pagination
const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────
// 📄 DONNÉES SIMULÉES
// ─────────────────────────────────────────────
const MOCK_EXERCICES = [
  { id: 1, nom: "Exe 1", date_debut: "2024-03-02", date_fin: "2025-03-02", statut: "ACTIF" },
  { id: 2, nom: "Exe 2", date_debut: "2022-03-02", date_fin: "2023-03-02", statut: "CLOTURE" },
  { id: 3, nom: "Exe 3", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 4, nom: "Exe 4", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 5, nom: "Exe 5", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 6, nom: "Exe 6", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 7, nom: "Exe 7", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 8, nom: "Exe 8", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 9, nom: "Exe 9", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 10, nom: "Exe 10", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
  { id: 11, nom: "Exe 11", date_debut: "2021-03-02", date_fin: "2022-03-02", statut: "CLOTURE" },
];

const MOCK_SESSIONS = [
  { id: 1, nom: "Session Janvier 2025",  date_session: "2025-02-02", exercice_id: 1, statut: "ACTIVE",   nombre_membres_inscrits: 24, total_solidarite_collectee: 180000 },
  { id: 2, nom: "Session Décembre 2024", date_session: "2025-01-02", exercice_id: 1, statut: "CLOTUREE", nombre_membres_inscrits: 22, total_solidarite_collectee: 165000 },
  { id: 3, nom: "Session Novembre 2024", date_session: "2024-12-01", exercice_id: 1, statut: "CLOTUREE", nombre_membres_inscrits: 20, total_solidarite_collectee: 150000 },
  { id: 4, nom: "Session Octobre 2024",  date_session: "2024-11-01", exercice_id: 2, statut: "CLOTUREE", nombre_membres_inscrits: 19, total_solidarite_collectee: 142500 },
];

const MOCK_OPERATIONS = [
  { id: 1, type: "INSCRIPTION",    membre: "Jean Mbarga",   montant: 25000,  date: "2025-02-02", session_id: 1, description: "Inscription membre" },
  { id: 2, type: "SOLIDARITE",     membre: "Marie Ngo",     montant: 5000,   date: "2025-02-02", session_id: 1, description: "Paiement solidarité mensuelle" },
  { id: 3, type: "AIDE",           membre: "Paul Etoa",     montant: 50000,  date: "2025-02-03", session_id: 1, description: "Aide médicale accordée" },
  { id: 4, type: "EMPRUNT",        membre: "Sylvie Belinga",montant: 150000, date: "2025-02-05", session_id: 1, description: "Prêt accordé" },
  { id: 5, type: "REMBOURSEMENT",  membre: "Sylvie Belinga",montant: 15000,  date: "2025-02-10", session_id: 1, description: "Remboursement mensuel" },
  { id: 6, type: "INSCRIPTION",    membre: "Alain Fouda",   montant: 25000,  date: "2025-01-02", session_id: 2, description: "Inscription membre" },
  { id: 7, type: "SOLIDARITE",     membre: "Jean Mbarga",   montant: 5000,   date: "2025-01-02", session_id: 2, description: "Paiement solidarité mensuelle" },
  { id: 8, type: "EPARGNE",        membre: "Marie Ngo",     montant: 30000,  date: "2025-01-05", session_id: 2, description: "Versement épargne" },
];

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
// 📄 PAGE HISTORIQUE — multi-filtres
// ─────────────────────────────────────────────
interface HistoriquePageProps {
  visible: boolean;
  onClose: () => void;
  initialFilters?: string[];
  sessionId?: number | null;
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
  const [activeFilters, setActiveFilters] = useState<string[]>(initialFilters);

  React.useEffect(() => {
    setActiveFilters(initialFilters);
  }, [visible]);

  const toggleFilter = (key: string | null) => {
    if (key === null) { setActiveFilters([]); return; }
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const filteredOps = MOCK_OPERATIONS.filter((op) => {
    const matchSession = sessionId ? op.session_id === sessionId : true;
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
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL LISTE DES EXERCICES
// (affiche chaque exercice avec ses sessions en dessous — pas de déroulant)
// ─────────────────────────────────────────────
interface ExerciceListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: any) => void;
}

const ExerciceListModal = ({ visible, onClose, onSelectSession, onSelectExercice }: ExerciceListModalProps & { onSelectExercice: (exe: any) => void }) => {
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  const paginatedExercices = React.useMemo(() => {
    return MOCK_EXERCICES.slice(0, displayedItems);
  }, [displayedItems]);

  const hasMore = displayedItems < MOCK_EXERCICES.length;

  const loadMore = () => {
    setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, MOCK_EXERCICES.length));
  };

  const confirmDelete = (nom: string, onConfirm: () => void) => {
    Alert.alert("Confirmer la suppression", `Supprimer "${nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onConfirm },
    ]);
  };

  React.useEffect(() => {
    if (visible) {
      setDisplayedItems(ITEMS_PER_PAGE);
    }
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
        <ScrollView contentContainerStyle={listModal.list}>
          {paginatedExercices.map((exe) => (
            <View key={exe.id} style={listModal.block}>
              <TouchableOpacity
                style={listModal.itemRow}
                onPress={() => { onClose(); onSelectExercice(exe); }}
              >
                <View style={listModal.itemLeft}>
                  <Text style={listModal.itemNom}>{exe.nom}</Text>
                  <Text style={listModal.itemDate}>
                    {new Date(exe.date_debut).toLocaleDateString("fr-FR")}
                  </Text>
                  <Text style={listModal.itemDate}>
                    {new Date(exe.date_fin).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <View style={[
                  listModal.statusBadge,
                  { backgroundColor: exe.statut === "ACTIF" ? "#4361EE15" : "#66666615" },
                ]}>
                  <Text style={[listModal.statusText, { color: exe.statut === "ACTIF" ? "#4361EE" : "#888" }]}>
                    {exe.statut}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={listModal.actionRow}>
                <TouchableOpacity
                  style={listModal.btnModifier}
                  onPress={() => Alert.alert("Modifier", `Modification de ${exe.nom} (simulé)`)}
                >
                  <Text style={listModal.btnModifierText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={listModal.btnSupprimer}
                  onPress={() => confirmDelete(exe.nom, () => Alert.alert("Info", "Suppression simulée"))}
                >
                  <Text style={listModal.btnSupprimerText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Bouton "Voir plus" */}
          {hasMore && (
            <TouchableOpacity style={listModal.loadMoreButton} onPress={loadMore}>
              <LinearGradient
                colors={["#4361EE", "#3A86FF"]}
                style={listModal.loadMoreGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={listModal.loadMoreText}>
                  Voir plus ({MOCK_EXERCICES.length - displayedItems} restant{MOCK_EXERCICES.length - displayedItems > 1 ? "s" : ""})
                </Text>
                <Ionicons name="chevron-down" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL LISTE DES SESSIONS
// (clic sur une session → historique filtré par session)
// ─────────────────────────────────────────────
interface SessionListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: any) => void;
  exerciceId?: number;
}

const SessionListModal = ({ visible, onClose, onSelectSession, exerciceId }: SessionListModalProps) => {
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  const allSessions = exerciceId
    ? MOCK_SESSIONS.filter((s) => s.exercice_id === exerciceId)
    : MOCK_SESSIONS;

  const paginatedSessions = React.useMemo(() => {
    return allSessions.slice(0, displayedItems);
  }, [allSessions, displayedItems]);

  const hasMore = displayedItems < allSessions.length;

  const loadMore = () => {
    setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, allSessions.length));
  };

  const confirmDelete = (nom: string, onConfirm: () => void) => {
    Alert.alert("Confirmer la suppression", `Supprimer "${nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onConfirm },
    ]);
  };

  React.useEffect(() => {
    if (visible) {
      setDisplayedItems(ITEMS_PER_PAGE);
    }
  }, [visible, exerciceId]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={listModal.container}>
        <View style={listModal.header}>
          <TouchableOpacity onPress={onClose} style={listModal.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
            <Text style={listModal.title}>
              {exerciceId
                ? `Sessions — ${MOCK_EXERCICES.find(e => e.id === exerciceId)?.nom ?? ""}`
                : "Liste des sessions"}
            </Text>
        </View>

        <ScrollView contentContainerStyle={listModal.list}>
          {paginatedSessions.map((sess) => (
            <View key={sess.id} style={listModal.block}>
              <TouchableOpacity
                style={listModal.itemRow}
                onPress={() => { onClose(); onSelectSession(sess); }}
              >
                <View style={listModal.itemLeft}>
                  <Text style={listModal.itemNom}>{sess.nom}</Text>
                  <Text style={listModal.itemDate}>
                    {new Date(sess.date_session).toLocaleDateString("fr-FR")}
                  </Text>
                  <Text style={listModal.itemDate}>
                    {sess.nombre_membres_inscrits} membres inscrits
                  </Text>
                </View>
                <View style={[
                  listModal.statusBadge,
                  { backgroundColor: sess.statut === "ACTIVE" ? "#38A3A515" : "#66666615" },
                ]}>
                  <Text style={[listModal.statusText, { color: sess.statut === "ACTIVE" ? "#38A3A5" : "#888" }]}>
                    {sess.statut}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={listModal.actionRow}>
                <TouchableOpacity
                  style={listModal.btnModifier}
                  onPress={() => Alert.alert("Modifier", `Modification de ${sess.nom} (simulé)`)}
                >
                  <Text style={listModal.btnModifierText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={listModal.btnSupprimer}
                  onPress={() => confirmDelete(sess.nom, () => Alert.alert("Info", "Suppression simulée"))}
                >
                  <Text style={listModal.btnSupprimerText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Bouton "Voir plus" */}
          {hasMore && (
            <TouchableOpacity style={listModal.loadMoreButton} onPress={loadMore}>
              <LinearGradient
                colors={["#38A3A5", "#57CC99"]}
                style={listModal.loadMoreGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={listModal.loadMoreText}>
                  Voir plus ({allSessions.length - displayedItems} restant{allSessions.length - displayedItems > 1 ? "s" : ""})
                </Text>
                <Ionicons name="chevron-down" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// 📄 MODAL NOUVELLE SESSION (identique à l'original)
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
    montant_depense: "",
    motif_depense: "",
  });
 
  // Réinitialiser le formulaire à chaque ouverture
  React.useEffect(() => {
    if (visible) {
      setFormData({
        nom: "",
        date_session: new Date().toISOString().split("T")[0],
        montant_collation: "45000",
        montant_depense: "",
        motif_depense: "",
      });
    }
  }, [visible]);
 
  const hasDepense = formData.montant_depense.trim() !== "";
 
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
              value={formData.montant_depense}
              onChangeText={(text) => setFormData({ ...formData, montant_depense: text })}
              keyboardType="numeric"
            />
 
            <Text style={[styles.inputLabel, !hasDepense && styles.inputLabelDisabled]}>
              Motif / Description
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, !hasDepense && styles.inputDisabled]}
              placeholder="Ex: Achat fournitures, location salle . . ."
              value={formData.motif_depense}
              onChangeText={(text) => setFormData({ ...formData, motif_depense: text })}
              multiline
              numberOfLines={3}
              editable={hasDepense}
            />
            {hasDepense && formData.motif_depense.trim() === "" && (
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
                (loading || (hasDepense && formData.motif_depense.trim() === "")) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={() => onSubmit(formData)}
              disabled={loading || (hasDepense && formData.motif_depense.trim() === "")}
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
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const { data: dashboardData, isLoading, error, refetch } = useAdminDashboard();
  const { data: config } = useMutuelleConfig();
  const queryClient = useQueryClient();
  const createSessionMutation = useCreateNewSession();

  const [refreshing, setRefreshing] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [showSessionListModal, setShowSessionListModal] = useState(false);

  const [historiqueVisible, setHistoriqueVisible] = useState(false);
  const [historiqueFilters, setHistoriqueFilters] = useState<string[]>([]);
  const [historiqueSession, setHistoriqueSession] = useState<any>(null);
  const [historiqueTitle, setHistoriqueTitle] = useState("Historique des opérations");

  const [selectedExercice, setSelectedExercice] = useState<any>(null);
  const [showSessionsForExercice, setShowSessionsForExercice] = useState(false);

  const sessionLoading = createSessionMutation.isPending;
  const { data: currentExercise, isLoading: exerciseLoading } = useCurrentExercise();
  const { data: currentSession, isLoading: sessionLoading2 } = useCurrentSession();

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
    } finally {
      setRefreshing(false);
    }
  };

  // Ouvrir l'historique — filters[] vide = tout afficher, session null = toutes sessions
  const openHistorique = (title: string, filters: string[] = [], session: any = null) => {
    setHistoriqueTitle(title);
    setHistoriqueFilters(filters);
    setHistoriqueSession(session);
    setHistoriqueVisible(true);
  };

  // Depuis la liste des sessions → historique filtré par session
  const handleSelectSession = (sess: any) => {
    openHistorique(`Opérations — ${sess.nom}`, [], sess);
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
    try {
      const montantDepense = parseFloat(sessionData.montant_depense) || 0;
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
        apiData.montant_depense = montantDepense;
        apiData.motif_depense   = sessionData.motif_depense.trim();
      }
 
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
  };

  const stats = React.useMemo(() => {
    if (!dashboardData) return null;
    return {
      fondInscription: dashboardData.tresor?.fond_inscription || 0o0,
      fondSocial: dashboardData.fonds_social?.montant_total || 0o0,
      fondEpargne: dashboardData.tresor?.cumul_total_epargnes || 0o0,
      membres: dashboardData.tresor?.nombre_membres || 0,
      empruntsEnCours: dashboardData.emprunts_en_cours?.nombre || 0,
      alertesCount: dashboardData.alertes?.length || 0,
    };
  }, [dashboardData]);

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
    "Administrateur";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HEADER (identique à l'original) ══ */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour </Text>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userRole}>Administrateur</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
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
            </TouchableOpacity>
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

        {/* ══ SOLDE DES COMPTES ══ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solde des comptes</Text>

          <TouchableOpacity
            style={styles.soldeCard}
            onPress={() => openHistorique("Historique — Fond Inscription", ["INSCRIPTION"])}
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
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.soldeCard}
            onPress={() => openHistorique("Historique — Fond Social", ["SOLIDARITE", "AIDE"])}
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
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.soldeCard}
            onPress={() => openHistorique("Historique — Fond Épargne", ["EPARGNE"])}
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
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ══ EXERCICE & SESSION ══ */}
        <View style={styles.exerciseSessionContainer}>
          <Text style={styles.sectionTitle}>Exercices & Sessions</Text>
          <View style={styles.exerciseSessionGrid}>

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
              ) : currentExercise ? (
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

            <TouchableOpacity
              style={[styles.exerciseSessionCard, { backgroundColor: "#38A3A515" }]}
              onPress={() => setShowSessionListModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={20} color="#38A3A5" />
                <Text style={[styles.cardTitle, { color: "#38A3A5" }]}>Session</Text>
                <Ionicons name="chevron-forward" size={16} color="#38A3A5" style={{ marginLeft: "auto" }} />
              </View>
              {sessionLoading2 ? (
                <ActivityIndicator size="small" color="#38A3A5" />
              ) : currentSession ? (
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
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowSessionModal(true)}
                  >
                    <Text style={styles.createButtonText}>Créer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* ══ MODULES (4 selon maquette) ══ */}
        <View style={styles.modulesContainer}>
          <Text style={styles.sectionTitle}>Gestion Mutuelle</Text>
          <View style={styles.modulesGrid}>
            {[
              { id: "inscriptions",   title: "Membres",        subtitle: "Gérer les inscriptions des Membres", icon: "person-add", gradientColors: ["#4361EE", "#3A86FF"] as [string,string], route: "InscriptionsScreen" },
              { id: "solidarite",     title: "Solidarité",     subtitle: "Fonds social",                       icon: "heart",      gradientColors: ["#38A3A5", "#57CC99"] as [string,string], route: "SolidarityScreen" },
              { id: "epargne",        title: "Épargne",        subtitle: "Gestion des épargnes",               icon: "wallet",     gradientColors: ["#B5179E", "#F72585"] as [string,string], route: "SavingsScreen" },
              { id: "emprunts",       title: "Emprunts",       subtitle: "Prêts et crédits",                   icon: "card",       gradientColors: ["#F77F00", "#FCBF49"] as [string,string], route: "LoansScreen" },
              { id: "assistances",    title: "Assistances",    subtitle: "Aides et soutiens",                  icon: "medical",    gradientColors: ["#7209B7", "#A663CC"] as [string,string], route: "AssistanceScreen" },
              { id: "remboursements", title: "Remboursements", subtitle: "Suivi des retours",                  icon: "repeat",     gradientColors: ["#06FFA5", "#0EAD69"] as [string,string], route: "RepaymentsScreen" },
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

        {/* ══ BOUTON NOUVELLE SESSION (identique à l'original) ══ */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.newSessionButton}
            onPress={() => setShowSessionModal(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#4361EE", "#3A86FF"]}
              style={styles.newSessionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.newSessionText}>Nouvelle Session</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
      <NewSessionModal
        visible={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSubmit={handleCreateSession}
        loading={sessionLoading}
      />
      <ExerciceListModal
        visible={showExerciceModal}
        onClose={() => setShowExerciceModal(false)}
        onSelectSession={handleSelectSession}
        onSelectExercice={(exe) => {
          setSelectedExercice(exe);
          setShowSessionsForExercice(true);
        }}
      />
      <SessionListModal
        visible={showSessionListModal}
        onClose={() => setShowSessionListModal(false)}
        onSelectSession={handleSelectSession}
      />
      <SessionListModal
        visible={showSessionsForExercice}
        onClose={() => setShowSessionsForExercice(false)}
        onSelectSession={handleSelectSession}
        exerciceId={selectedExercice?.id}
      />
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

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, backgroundColor: COLORS.background },
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

  // Section
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: COLORS.text, marginBottom: SPACING.md },

  // Soldes
  soldeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  soldeLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  soldeIconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  soldeMontant: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: COLORS.text },
  soldeLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  // Exercice & Session
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

  // Modules
  modulesContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  modulesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: SPACING.md },
  moduleCard: { width: (width - SPACING.lg * 2 - SPACING.md) / 2, height: 140, borderRadius: BORDER_RADIUS.xl, overflow: "hidden", marginBottom: SPACING.md },
  moduleGradient: { flex: 1, padding: SPACING.md, justifyContent: "center" },
  moduleContent: { alignItems: "center" },
  moduleTitle: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: "white", marginTop: SPACING.sm, textAlign: "center" },
  moduleSubtitle: { fontSize: FONT_SIZES.xs, color: "rgba(255,255,255,0.8)", marginTop: SPACING.xs, textAlign: "center" },

  // Nouvelle session
  actionContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  newSessionButton: { borderRadius: BORDER_RADIUS.xl, overflow: "hidden", shadowColor: COLORS.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  newSessionGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  newSessionText: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: "white" },

  // Alertes
  alertsContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  alertCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  alertText: { fontSize: FONT_SIZES.sm, color: COLORS.text, marginLeft: SPACING.sm, flex: 1 },

  // Modal Nouvelle Session
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

  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, alignSelf: "flex-start" },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  btnModifier: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: "#4361EE15", alignItems: "center" },
  btnModifierText: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: "#4361EE" },
  btnSupprimer: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: "#FF000015", alignItems: "center" },
  btnSupprimerText: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: "#CC0000" },

  // Bloc sessions imbriquées (dans liste exercices)
  sessionsBlock: { backgroundColor: COLORS.background, margin: SPACING.md, marginTop: 0, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingTop: SPACING.sm },
  sessionsLabel: { fontSize: FONT_SIZES.xs, fontWeight: "700", color: COLORS.textSecondary, marginBottom: SPACING.xs, paddingHorizontal: SPACING.md },
  sessItem: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sessItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: SPACING.sm, paddingHorizontal: SPACING.md },
  sessNom: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  noItems: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, padding: SPACING.md, fontStyle: "italic" },

  // Load More Button
  loadMoreButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadMoreGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
});

// ─────────────────────────────────────────────
// 🎨 STYLES PAGE HISTORIQUE
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