import React, { useState, useMemo, useEffect } from "react";
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
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRepayments, useCreateRepayment, useLoans } from "../../hooks/useLoan";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useNavigation } from "@react-navigation/native";
import { useAuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;

// 🎨 Thème vert (identique à l'existant)
const GREEN_THEME = {
  primary: '#22C55E',
  secondary: '#16A34A',
  light: '#DCFCE7',
};

// 💰 Formatage monétaire
const formatCurrency = (amount: number | undefined | null): string => {
  if (!amount || isNaN(amount)) return "0 FCFA";
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr.slice(0, 10);
  }
};

// 🎯 Carte de remboursement (style LoansScreen)
const RepaymentCard = ({ item }: { item: any }) => {
  const montant = Number(item.montant) || 0;
  const capital = Number(item.montant_capital) || 0;
  const interet = Number(item.montant_interet) || 0;

  return (
    <View style={[styles.repaymentCard, { borderLeftColor: GREEN_THEME.primary }]}>
      <View style={styles.cardHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberInitials}>
            {(item.emprunt_info?.membre_nom || "?")[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.emprunt_info?.membre_nom || "—"}</Text>
          <Text style={styles.memberNumber}>{item.emprunt_info?.membre_numero || "—"}</Text>
        </View>
        <View style={styles.amountBadge}>
          <Text style={styles.amountBadgeText}>{formatCurrency(montant)}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Capital</Text>
            <Text style={styles.detailValue}>{formatCurrency(capital)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Intérêts</Text>
            <Text style={styles.detailValue}>{formatCurrency(interet)}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Session</Text>
            <Text style={styles.detailValue}>{item.session_nom || "—"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(item.date_remboursement)}</Text>
          </View>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text" size={14} color={COLORS.textSecondary} />
          <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );
};

// 🎯 Modal multi-step pour ajouter un remboursement
const AddRepaymentModal = ({ visible, onClose, onSubmit, loading }: any) => {
  const [step, setStep] = useState(1);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: membersRaw, isLoading: loadingMembers } = useMembers();
  const { data: loansRaw, isLoading: loadingLoans } = useLoans({ statut: ["EN_COURS", "EN_RETARD"] });

  const members = useMemo(() => {
    if (!membersRaw) return [];
    return Array.isArray(membersRaw) ? membersRaw : (membersRaw as any).results || [];
  }, [membersRaw]);

  const loans = useMemo(() => {
    if (!loansRaw) return [];
    return Array.isArray(loansRaw) ? loansRaw : (loansRaw as any).results || [];
  }, [loansRaw]);

  // Filtrer les membres qui ont un emprunt EN_COURS ou EN_RETARD
  const membersWithActiveLoan = useMemo(() => {
    const activeLoanMemberIds = new Set(
      loans.filter((loan: any) => (loan.statut === "EN_COURS" || loan.statut === "EN_RETARD")).map((loan: any) => loan.membre_info?.id)
    );
    return members.filter((m: any) => activeLoanMemberIds.has(m.id));
  }, [members, loans]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return membersWithActiveLoan;
    const q = memberSearch.toLowerCase();
    return membersWithActiveLoan.filter((m: any) => {
      const nom = m.utilisateur?.nom_complet || m.nom_complet || "";
      const numero = m.numero_membre || "";
      return nom.toLowerCase().includes(q) || numero.toLowerCase().includes(q);
    });
  }, [membersWithActiveLoan, memberSearch]);

  const selectedMemberLoan = useMemo(() => {
    if (!selectedMember) return null;
    return loans.find((loan: any) => 
      loan.membre_info?.id === selectedMember.id && (loan.statut === "EN_COURS" || loan.statut === "EN_RETARD")
    ) || null;
  }, [loans, selectedMember]);

  const restant = selectedMemberLoan
    ? (selectedMemberLoan.montant_total_a_rembourser - selectedMemberLoan.montant_rembourse)
    : 0;

  const resetModal = () => {
    setStep(1);
    setSelectedMember(null);
    setMemberSearch("");
    setAmount("");
    setNotes("");
  };

  useEffect(() => {
    if (!visible) resetModal();
  }, [visible]);

  const handleMemberSelect = (member: any) => {
    setSelectedMember(member);
    setStep(2);
  };

  const handleValidateAmount = () => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Erreur", "Montant invalide.");
      return;
    }
    if (Number(amount) > restant) {
      Alert.alert(
        "Montant trop élevé",
        `Le montant maximum remboursable est ${formatCurrency(restant)}.`
      );
      return;
    }
    setStep(3);
  };

  const handleSubmit = () => {
    if (!selectedMemberLoan) return;
    const montantNum = parseFloat(amount);
    onSubmit({
      emprunt: selectedMemberLoan.id,
      montant: montantNum,
      notes: notes.trim(),
    });
  };

  const stepLabels = ["Membre", "Montant", "Récapitulatif"];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[GREEN_THEME.primary, GREEN_THEME.secondary]}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Nouveau remboursement</Text>
                <View style={{ width: 40 }} />
              </View>
              <View style={styles.stepIndicator}>
                <View style={styles.stepBar}>
                  {[1, 2, 3].map((s) => (
                    <View key={s} style={styles.stepBarItem}>
                      <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                        {step > s ? (
                          <Ionicons name="checkmark" size={12} color="white" />
                        ) : (
                          <Text style={[styles.stepNum, step === s && { color: GREEN_THEME.primary }]}>
                            {s}
                          </Text>
                        )}
                      </View>
                      {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
                    </View>
                  ))}
                </View>
                <Text style={styles.stepLabel}>{stepLabels[step - 1]}</Text>
              </View>
            </LinearGradient>

            <View style={styles.modalBody}>
              {step === 1 && (
                <View style={{ flex: 1 }}>
                  <View style={styles.modalSearchContainer}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.modalSearchInput}
                      value={memberSearch}
                      onChangeText={setMemberSearch}
                      placeholder="Rechercher un membre..."
                      placeholderTextColor={COLORS.textLight}
                      autoFocus
                    />
                    {memberSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setMemberSearch("")}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.modalResultCount}>
                    {filteredMembers.length} membre{filteredMembers.length !== 1 ? "s" : ""}
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {loadingMembers ? (
                      <ActivityIndicator size="large" color={GREEN_THEME.primary} style={{ marginTop: 40 }} />
                    ) : filteredMembers.length === 0 ? (
                      <View style={styles.emptyModal}>
                        <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                        <Text style={styles.emptyModalText}>
                          {memberSearch ? "Aucun membre trouvé" : "Aucun membre avec emprunt en cours ou en retard"}
                        </Text>
                      </View>
                    ) : (
                      filteredMembers.map((member: any) => {
                        const nom = member.utilisateur?.nom_complet || member.nom_complet || "—";
                        const numero = member.numero_membre || "—";
                        return (
                          <TouchableOpacity
                            key={member.id}
                            style={styles.modalMemberItem}
                            onPress={() => handleMemberSelect(member)}
                          >
                            <View style={styles.modalMemberAvatar}>
                              <Text style={styles.modalMemberInitials}>
                                {nom.substring(0, 2).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.modalMemberName}>{nom}</Text>
                              <Text style={styles.modalMemberNumber}>{numero}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}

              {step === 2 && selectedMemberLoan && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.memberBanner}>
                    <View style={styles.memberBannerAvatar}>
                      <Text style={styles.memberBannerInitials}>
                        {(selectedMember.utilisateur?.nom_complet || "?")[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberBannerName}>
                        {selectedMember.utilisateur?.nom_complet}
                      </Text>
                      <Text style={styles.memberBannerNumber}>{selectedMember.numero_membre}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.changeBtn}>
                      <Text style={styles.changeBtnText}>Changer</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.loanSummary}>
                    <Text style={styles.loanSummaryTitle}>Détails de l'emprunt</Text>
                    <View style={styles.loanSummaryRow}>
                      <Text style={styles.loanSummaryLabel}>Montant emprunté</Text>
                      <Text style={styles.loanSummaryValue}>
                        {formatCurrency(selectedMemberLoan.montant_emprunte)}
                      </Text>
                    </View>
                    <View style={styles.loanSummaryRow}>
                      <Text style={styles.loanSummaryLabel}>Déjà remboursé</Text>
                      <Text style={styles.loanSummaryValue}>
                        {formatCurrency(selectedMemberLoan.montant_rembourse)}
                      </Text>
                    </View>
                    <View style={[styles.loanSummaryRow, styles.loanSummaryRowHighlight]}>
                      <Text style={styles.loanSummaryLabel}>Restant à rembourser</Text>
                      <Text style={[styles.loanSummaryValue, { color: GREEN_THEME.primary, fontWeight: 'bold' }]}>
                        {formatCurrency(restant)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Montant *</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="Montant en FCFA"
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textLight}
                    />
                    <Text style={styles.inputHint}>Maximum : {formatCurrency(restant)}</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Notes..."
                      multiline
                      numberOfLines={3}
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.backModalButton]}
                      onPress={() => setStep(1)}
                    >
                      <Text style={styles.backModalButtonText}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitModalButton, (!amount || Number(amount) <= 0 || Number(amount) > restant) && { opacity: 0.6 }]}
                      onPress={handleValidateAmount}
                      disabled={!amount || Number(amount) <= 0 || Number(amount) > restant}
                    >
                      <Text style={styles.submitModalButtonText}>Suivant</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}

              {step === 3 && selectedMemberLoan && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.recapCard}>
                    <Text style={styles.recapTitle}>Récapitulatif du remboursement</Text>
                    
                    <View style={styles.recapSection}>
                      <Text style={styles.recapSectionTitle}>Membre</Text>
                      <View style={styles.recapMemberBanner}>
                        <View style={styles.recapMemberAvatar}>
                          <Text style={styles.recapMemberInitials}>
                            {(selectedMember.utilisateur?.nom_complet || "?")[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recapMemberName}>
                            {selectedMember.utilisateur?.nom_complet}
                          </Text>
                          <Text style={styles.recapMemberNumber}>{selectedMember.numero_membre}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setStep(2)} style={styles.editBtn}>
                          <Ionicons name="pencil" size={16} color={GREEN_THEME.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.recapDividerLine} />

                    <View style={styles.recapSection}>
                      <Text style={styles.recapSectionTitle}>Détails de l'emprunt</Text>
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>Montant emprunté</Text>
                        <Text style={styles.recapValue}>
                          {formatCurrency(selectedMemberLoan.montant_emprunte)}
                        </Text>
                      </View>
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>Déjà remboursé</Text>
                        <Text style={styles.recapValue}>
                          {formatCurrency(selectedMemberLoan.montant_rembourse)}
                        </Text>
                      </View>
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>Restant avant</Text>
                        <Text style={styles.recapValue}>
                          {formatCurrency(restant)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recapDividerLine} />

                    <View style={styles.recapSection}>
                      <Text style={styles.recapSectionTitle}>Remboursement</Text>
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>Montant à rembourser</Text>
                        <Text style={[styles.recapValue, { color: GREEN_THEME.primary, fontWeight: 'bold', fontSize: FONT_SIZES.lg }]}>
                          {formatCurrency(Number(amount))}
                        </Text>
                      </View>
                      <View style={styles.recapRow}>
                        <Text style={styles.recapLabel}>Restant après</Text>
                        <Text style={[styles.recapValue, { color: COLORS.textSecondary }]}>
                          {formatCurrency(Math.max(0, restant - Number(amount)))}
                        </Text>
                      </View>
                      {notes.trim() && (
                        <>
                          <View style={styles.recapDivider} />
                          <View style={styles.recapNotesSection}>
                            <Ionicons name="document-text" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.recapNotes}>{notes.trim()}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.backModalButton]}
                      onPress={() => setStep(2)}
                    >
                      <Text style={styles.backModalButtonText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitModalButton, loading && { opacity: 0.6 }]}
                      onPress={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.submitModalButtonText}>Valider</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// 📱 Composant principal
export default function RepaymentsScreen() {
  const { user } = useAuthContext();
  const readOnly = !user?.can_write;
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  const { data: repaymentsRaw, isLoading, refetch } = useRepayments();
  const { data: session } = useCurrentSession();
  const createRepayment = useCreateRepayment();

  const repayments = useMemo(() => {
    if (!repaymentsRaw) return [];
    return Array.isArray(repaymentsRaw) ? repaymentsRaw : (repaymentsRaw as any).results || [];
  }, [repaymentsRaw]);

  const filteredRepayments = useMemo(() => {
    if (!search.trim()) return repayments;
    const q = search.toLowerCase();
    return repayments.filter((item: any) => {
      const nom = item.emprunt_info?.membre_nom || "";
      const numero = item.emprunt_info?.membre_numero || "";
      return nom.toLowerCase().includes(q) || numero.toLowerCase().includes(q);
    });
  }, [repayments, search]);

  const paginated = useMemo(() => filteredRepayments.slice(0, displayedItems), [filteredRepayments, displayedItems]);
  const hasMore = displayedItems < filteredRepayments.length;

  const loadMore = () => setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, filteredRepayments.length));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddRepayment = async (data: any) => {
    try {
      await createRepayment.mutateAsync({
        ...data,
        session: session?.id,
      });
      setShowModal(false);
      refetch();
      Alert.alert("Succès", "Remboursement enregistré !");
    } catch (error: any) {
      Alert.alert("Erreur", error?.response?.data?.error || "Impossible d'enregistrer");
    }
  };

  useEffect(() => {
    setDisplayedItems(ITEMS_PER_PAGE);
  }, [search]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[GREEN_THEME.primary, GREEN_THEME.secondary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="repeat" size={32} color="white" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Remboursements</Text>
          <Text style={styles.headerSubtitle}>
            Session : {session?.nom || "Chargement..."}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un membre..."
            placeholderTextColor={COLORS.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {!readOnly && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
            <LinearGradient
              colors={[GREEN_THEME.primary, GREEN_THEME.secondary]}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GREEN_THEME.primary} />}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={GREEN_THEME.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : filteredRepayments.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucun remboursement</Text>
            <Text style={styles.emptyText}>
              {search ? "Aucun résultat pour cette recherche" : "Commencez par enregistrer un remboursement"}
            </Text>
            {!search && !readOnly && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowModal(true)}>
                <Text style={styles.emptyButtonText}>Ajouter un remboursement</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.counter}>
              <Ionicons name="list" size={16} color={GREEN_THEME.primary} />
              <Text style={styles.counterText}>
                <Text style={styles.counterBold}>{paginated.length}</Text> sur{" "}
                <Text style={styles.counterBold}>{filteredRepayments.length}</Text> remboursement{filteredRepayments.length > 1 ? "s" : ""}
              </Text>
            </View>
            {paginated.map((item: any) => (
              <RepaymentCard key={item.id} item={item} />
            ))}
            {hasMore && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                <LinearGradient
                  colors={[GREEN_THEME.primary, GREEN_THEME.secondary]}
                  style={styles.loadMoreGradient}
                >
                  <Text style={styles.loadMoreText}>
                    Voir plus ({filteredRepayments.length - displayedItems} restant{filteredRepayments.length - displayedItems > 1 ? "s" : ""})
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 70 }} />
      </ScrollView>

      <AddRepaymentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddRepayment}
        loading={createRepayment.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerContent: { alignItems: "center" },
  headerIcon: { marginBottom: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZES.xxxl, fontWeight: "bold", color: "white", marginBottom: SPACING.xs, textAlign: "center" },
  headerSubtitle: { fontSize: FONT_SIZES.md, color: "rgba(255,255,255,0.8)", textAlign: "center" },

  searchSection: { flexDirection: "row", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md, alignItems: "center" },
  searchContainer: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  searchInput: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, paddingVertical: SPACING.md },
  addButton: { borderRadius: BORDER_RADIUS.lg, overflow: "hidden" },
  addButtonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm, borderRadius: BORDER_RADIUS.lg },
  addButtonText: { color: "white", fontSize: FONT_SIZES.md, fontWeight: "600" },

  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xxl },
  loadingText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
  emptyButton: { backgroundColor: GREEN_THEME.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md },
  emptyButtonText: { color: "white", fontWeight: "600", fontSize: FONT_SIZES.md },

  counter: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GREEN_THEME.light, borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: 8, marginBottom: SPACING.md },
  counterText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  counterBold: { fontWeight: "700", color: GREEN_THEME.primary },

  repaymentCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadowLight, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: GREEN_THEME.light, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  memberInitials: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: GREEN_THEME.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: COLORS.text, marginBottom: SPACING.xs },
  memberNumber: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  amountBadge: { backgroundColor: GREEN_THEME.light, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.md },
  amountBadgeText: { fontSize: FONT_SIZES.sm, fontWeight: "bold", color: GREEN_THEME.primary },
  cardDetails: { gap: SPACING.sm, marginBottom: SPACING.sm },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.md },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text },
  notesContainer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, gap: SPACING.sm },
  notesText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, flex: 1 },

  loadMoreButton: { marginTop: SPACING.lg, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: "hidden" },
  loadMoreGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: SPACING.sm },
  loadMoreText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: "white" },

  // Modal styles (inspirées des autres écrans)
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContainer: { backgroundColor: COLORS.background, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, height: "90%", overflow: "hidden" },
  modalHeader: { paddingTop: SPACING.lg, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md },
  modalClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: "white" },
  stepIndicator: { alignItems: "center" },
  stepBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.xs },
  stepBarItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: "white" },
  stepNum: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  stepLine: { width: 32, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 4 },
  stepLineActive: { backgroundColor: "white" },
  stepLabel: { fontSize: FONT_SIZES.sm, color: "rgba(255,255,255,0.9)" },
  modalBody: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  modalSearchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  modalSearchInput: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text, paddingVertical: 12 },
  modalResultCount: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  modalMemberItem: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  modalMemberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: GREEN_THEME.light, alignItems: "center", justifyContent: "center" },
  modalMemberInitials: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: GREEN_THEME.primary },
  modalMemberName: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  modalMemberNumber: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  emptyModal: { alignItems: "center", paddingVertical: 40 },
  emptyModalText: { fontSize: FONT_SIZES.md, color: COLORS.textLight, marginTop: SPACING.md, textAlign: "center" },
  memberBanner: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: GREEN_THEME.light, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
  memberBannerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN_THEME.primary, alignItems: "center", justifyContent: "center" },
  memberBannerInitials: { fontSize: FONT_SIZES.lg, fontWeight: "bold", color: "white" },
  memberBannerName: { fontSize: FONT_SIZES.md, fontWeight: "bold", color: COLORS.text },
  memberBannerNumber: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  changeBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: "white", borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: GREEN_THEME.primary },
  changeBtnText: { color: GREEN_THEME.primary, fontWeight: "600", fontSize: FONT_SIZES.sm },
  loanSummary: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  loanSummaryTitle: { fontSize: FONT_SIZES.sm, fontWeight: "bold", color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: "uppercase" },
  loanSummaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  loanSummaryRowHighlight: { borderBottomWidth: 0, backgroundColor: GREEN_THEME.light, marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  loanSummaryLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  loanSummaryValue: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text },
  inputGroup: { marginBottom: SPACING.lg },
  inputLabel: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 80, textAlignVertical: "top" },
  inputHint: { fontSize: FONT_SIZES.sm, color: GREEN_THEME.primary, marginTop: SPACING.xs },
  modalActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.lg },
  modalButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: "center", justifyContent: "center" },
  backModalButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  backModalButtonText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.textSecondary },
  submitModalButton: { backgroundColor: GREEN_THEME.primary },
  submitModalButtonText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: "white" },
  // Styles pour le récapitulatif
  recapCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recapDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  recapLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  recapValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  backButtonText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: GREEN_THEME.primary,
    fontWeight: '600',
  },
  // Styles pour le récapitulatif avancé
  recapTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  recapSection: {
    marginBottom: SPACING.lg,
  },
  recapSectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recapMemberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_THEME.light,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  recapMemberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapMemberInitials: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: 'white',
  },
  recapMemberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  recapMemberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GREEN_THEME.primary,
  },
  recapDividerLine: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  recapNotesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  recapNotes: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});