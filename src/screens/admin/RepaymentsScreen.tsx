import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
  RefreshControl,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../constants/config";
import { useRepayments, useCreateRepayment, useLoans } from "../../hooks/useLoan";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🎨 Couleurs du thème vert
const GREEN_THEME = {
  primary: '#22C55E',
  secondary: '#16A34A',
  light: '#DCFCE7',
  gradient: ['#22C55E', '#16A34A'],
  gradientLight: ['#F0FDF4', '#DCFCE7'],
  success: '#15803D',
  accent: '#059669',
};

// 💰 Utilitaire pour formater les montants
const formatMoney = (val: any, fallback = "--") => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return typeof num === "number" && !isNaN(num)
    ? `${num.toLocaleString("fr-FR")} FCFA`
    : fallback;
};

// 📅 Utilitaire pour formater les dates
const formatDate = (dateStr: string) => {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr.slice(0, 10);
  }
};

// 🔍 Composant de recherche simple
const SearchBar = ({ search, onSearchChange, placeholder }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.searchContainer}>
      <View style={[styles.searchInputContainer, isFocused && styles.searchInputFocused]}>
        <Ionicons name="search" size={20} color={GREEN_THEME.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={search}
          onChangeText={onSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={COLORS.textLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// 💳 Composant carte de remboursement
const RepaymentCard = ({ item, index }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.repaymentCard, animatedStyle]}>
      <LinearGradient
        colors={['#FFFFFF', '#FAFFFE']}
        style={styles.cardGradient}
      >
        {/* Header de la carte */}
        <View style={styles.cardHeader}>
          <View style={styles.memberInfo}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitials}>
                {(item.emprunt_info?.membre_nom || "?").substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>
                {item.emprunt_info?.membre_nom || "--"}
              </Text>
              <Text style={styles.memberNumber}>
                N° {item.emprunt_info?.membre_numero || "--"}
              </Text>
            </View>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatMoney(item.montant)}</Text>
            <Text style={styles.date}>{formatDate(item.date_remboursement)}</Text>
          </View>
        </View>

        {/* Détails du remboursement */}
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Capital</Text>
              <Text style={styles.detailValue}>{formatMoney(item.montant_capital)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Intérêts</Text>
              <Text style={styles.detailValue}>{formatMoney(item.montant_interet)}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Emprunt initial</Text>
              <Text style={styles.detailValue}>
                {formatMoney(item.emprunt_info?.montant_emprunte)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Session</Text>
              <Text style={styles.detailValue}>{item.session_nom || "--"}</Text>
            </View>
          </View>
        </View>

        {/* Notes si présentes */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text" size={16} color={COLORS.textSecondary} />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Indicateur de statut */}
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: GREEN_THEME.success }]} />
          <Text style={styles.statusText}>Remboursement validé</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// 🆕 Modal d'ajout rapide (2 étapes max)
const AddRepaymentModal = ({ 
  visible, 
  onClose, 
  onSubmit,
  loading 
}: any) => {
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(1); // 1: Membre, 2: Détails

  const { data: membersRaw, isLoading: loadingMembers } = useMembers();
  const { data: loansRaw, isLoading: loadingLoans } = useLoans({ statut: "EN_COURS" });

  // Traitement des données
  const membersArr = useMemo(() => {
    if (!membersRaw) return [];
    if (Array.isArray(membersRaw)) return membersRaw;
    return (membersRaw as any).results || [];
  }, [membersRaw]);

  const loansArr = useMemo(() => {
    if (!loansRaw) return [];
    if (Array.isArray(loansRaw)) return loansRaw;
    return (loansRaw as any).results || [];
  }, [loansRaw]);

  // 🔍 Recherche de membres avec debounce
  const [debouncedSearch, setDebouncedSearch] = useState(memberSearch);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // Filtrage des membres par recherche
  const filteredMembers = useMemo(() => {
    if (!debouncedSearch.trim()) return membersArr;
    const searchLower = debouncedSearch.trim().toLowerCase();
    
    return membersArr.filter((member: any) => {
      const nom = member?.utilisateur?.nom_complet || member?.nom_complet || "";
      const numero = member?.numero_membre || "";
      const email = member?.utilisateur?.email || "";
      
      return (
        nom.toLowerCase().includes(searchLower) ||
        numero.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower)
      );
    });
  }, [membersArr, debouncedSearch]);

  // 🎯 Trouve l'emprunt en cours du membre sélectionné
  const memberLoan = useMemo(() => {
    if (!selectedMember) return null;
    return loansArr.find((loan: any) => 
      loan?.membre_info?.id === selectedMember.id && 
      loan?.statut === 'EN_COURS'
    ) || null;
  }, [loansArr, selectedMember]);

  const handleSelectMember = (member: any) => {
    setSelectedMember(member);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!memberLoan || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs correctement.");
      return;
    }

    const numAmount = Number(amount);
    const maxAmount = memberLoan.montant_total_a_rembourser - memberLoan.montant_rembourse;

    if (numAmount > maxAmount) {
      Alert.alert(
        "Montant trop élevé", 
        `Le montant maximum remboursable est de ${formatMoney(maxAmount)}`
      );
      return;
    }

    onSubmit({
      emprunt: memberLoan.id,
      montant: numAmount,
      notes,
    });
  };

  const resetModal = () => {
    setSelectedMember(null);
    setMemberSearch("");
    setAmount("");
    setNotes("");
    setStep(1);
  };

  useEffect(() => {
    if (!visible) {
      setTimeout(resetModal, 300);
    }
  }, [visible]);

  const renderStep1 = () => (
    <View style={styles.modalStep}>
      <Text style={styles.modalStepTitle}>Sélectionner un membre</Text>
      
      {/* Recherche de membre */}
      <SearchBar
        search={memberSearch}
        onSearchChange={setMemberSearch}
        placeholder="Rechercher un membre..."
      />

      {loadingMembers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN_THEME.primary} />
          <Text style={styles.loadingText}>Chargement des membres...</Text>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {memberSearch ? "Aucun membre trouvé" : "Aucun membre disponible"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const nom = item?.utilisateur?.nom_complet || item?.nom_complet || "--";
            const numero = item?.numero_membre || "--";
            const email = item?.utilisateur?.email || "";
            
            // Vérifier si ce membre a un emprunt en cours
            const hasLoan = loansArr.some((loan: any) => 
              loan?.membre_info?.id === item.id && loan?.statut === 'EN_COURS'
            );

            return (
              <TouchableOpacity
                style={[
                  styles.memberCard,
                  !hasLoan && styles.memberCardDisabled
                ]}
                onPress={() => hasLoan ? handleSelectMember(item) : null}
                disabled={!hasLoan}
              >
                <View style={styles.memberCardContent}>
                  <View style={[
                    styles.memberAvatar,
                    !hasLoan && styles.memberAvatarDisabled
                  ]}>
                    <Text style={[
                      styles.memberInitials,
                      !hasLoan && styles.memberInitialsDisabled
                    ]}>
                      {nom.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.memberInfo}>
                    <Text style={[
                      styles.memberName,
                      !hasLoan && styles.memberNameDisabled
                    ]}>
                      {nom}
                    </Text>
                    
                   
                  </View>
                  
                  <View style={styles.memberStatus}>
                    {hasLoan ? (
                      <View style={styles.hasLoanBadge}>
                        <Ionicons name="cash" size={16} color={GREEN_THEME.primary} />
                        <Text style={styles.hasLoanText}>Emprunt actif</Text>
                      </View>
                    ) : (
                      <View style={styles.noLoanBadge}>
                        <Text style={styles.noLoanText}>Aucun emprunt</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          style={styles.membersList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.modalStep}>
      <Text style={styles.modalStepTitle}>
        Remboursement pour {selectedMember?.utilisateur?.nom_complet}
      </Text>
      
      {/* Informations sur l'emprunt */}
      {memberLoan && (
        <View style={styles.loanInfoCard}>
          <LinearGradient
            colors={GREEN_THEME.gradientLight}
            style={styles.loanInfoGradient}
          >
            <View style={styles.loanInfoHeader}>
              <Ionicons name="cash" size={24} color={GREEN_THEME.primary} />
              <Text style={styles.loanInfoTitle}>Emprunt en cours</Text>
            </View>
            
            <View style={styles.loanInfoDetails}>
              <View style={styles.loanInfoRow}>
                <Text style={styles.loanInfoLabel}>Montant emprunté</Text>
                <Text style={styles.loanInfoValue}>
                  {formatMoney(memberLoan.montant_emprunte)}
                </Text>
              </View>
              
              <View style={styles.loanInfoRow}>
                <Text style={styles.loanInfoLabel}>Total à rembourser</Text>
                <Text style={styles.loanInfoValue}>
                  {formatMoney(memberLoan.montant_total_a_rembourser)}
                </Text>
              </View>
              
              <View style={styles.loanInfoRow}>
                <Text style={styles.loanInfoLabel}>Déjà remboursé</Text>
                <Text style={styles.loanInfoValue}>
                  {formatMoney(memberLoan.montant_rembourse)}
                </Text>
              </View>
              
              <View style={[styles.loanInfoRow, styles.loanInfoRowHighlight]}>
                <Text style={styles.loanInfoLabelHighlight}>Restant à rembourser</Text>
                <Text style={styles.loanInfoValueHighlight}>
                  {formatMoney(memberLoan.montant_total_a_rembourser - memberLoan.montant_rembourse)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Formulaire de remboursement */}
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Montant du remboursement *</Text>
          <TextInput
            style={styles.modalInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textLight}
          />
          {memberLoan && (
            <Text style={styles.inputHint}>
              Maximum: {formatMoney(memberLoan.montant_total_a_rembourser - memberLoan.montant_rembourse)}
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.modalInput, styles.modalInputMultiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ajouter une note..."
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>

      <View style={styles.modalButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <Ionicons name="arrow-back" size={20} color={GREEN_THEME.primary} />
          {/* <Text style={styles.backButtonText}>Retour</Text> */}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.submitButtonText}>Valider</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={GREEN_THEME.gradientLight}
          style={styles.modalHeader}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={GREEN_THEME.primary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nouveau remboursement</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>{step}/2</Text>
          </View>
        </LinearGradient>

        <View style={styles.modalContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </View>
      </View>
    </Modal>
  );
};

// 📱 Composant principal
export default function RepaymentsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data hooks
  const { data: repaymentsRaw, isLoading, refetch } = useRepayments();
  const { data: session } = useCurrentSession();
  const createRepayment = useCreateRepayment();

  // Traitement des données avec gestion pagination DRF
  const repaymentsArr = useMemo(() => {
    if (!repaymentsRaw) return [];
    if (Array.isArray(repaymentsRaw)) return repaymentsRaw;
    return (repaymentsRaw as any).results || [];
  }, [repaymentsRaw]);

  // 🔍 Recherche filtrée avec debounce
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredRepayments = useMemo(() => {
    if (!debouncedSearch.trim()) return repaymentsArr;
    const searchLower = debouncedSearch.trim().toLowerCase();
    
    return repaymentsArr.filter((item: any) => {
      const nom = item?.emprunt_info?.membre_nom || "";
      const numero = item?.emprunt_info?.membre_numero || "";
      const notes = item?.notes || "";
      const montant = item?.montant?.toString() || "";
      
      return (
        nom.toLowerCase().includes(searchLower) ||
        numero.toLowerCase().includes(searchLower) ||
        notes.toLowerCase().includes(searchLower) ||
        montant.includes(searchLower.replace(/\s/g, ''))
      );
    });
  }, [repaymentsArr, debouncedSearch]);

  // Gestion du refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Gestion ajout remboursement
  const handleAddRepayment = useCallback(async (data: any) => {
    try {
      await createRepayment.mutateAsync({
        ...data,
        session: session?.id,
      });
      
      Alert.alert(
        "Succès ✅", 
        "Le remboursement a été ajouté avec succès !",
        [{ text: "OK", onPress: () => setModalVisible(false) }]
      );
      
      refetch();
    } catch (error: any) {
      Alert.alert(
        "Erreur ❌",
        error?.response?.data?.error || error?.message || "Erreur lors de l'ajout"
      );
    }
  }, [createRepayment, session, refetch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header avec gradient et navigation */}
      <LinearGradient
        colors={GREEN_THEME.gradient}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {/* Bouton retour */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            {/* Titre et icône */}
            <View style={styles.headerCenter}>
              <View style={styles.headerIcon}>
                <Ionicons name="wallet" size={28} color="white" />
              </View>
              <Text style={styles.headerTitle}>Remboursements</Text>
            </View>

            {/* Bouton d'ajout */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={24} color={GREEN_THEME.primary} />
            </TouchableOpacity>
          </View>

          {/* Compteur simple */}
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {filteredRepayments.length} remboursement{filteredRepayments.length > 1 ? 's' : ''}
              {search && ` sur ${repaymentsArr.length}`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Zone de recherche */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Rechercher un membre, montant..."
      />

      {/* Liste des remboursements */}
      <View style={styles.listContainer}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN_THEME.primary} />
            <Text style={styles.loadingText}>Chargement des remboursements...</Text>
          </View>
        ) : filteredRepayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={GREEN_THEME.gradientLight}
              style={styles.emptyGradient}
            >
              <Ionicons name="receipt-outline" size={64} color={GREEN_THEME.primary} />
              <Text style={styles.emptyTitle}>
                {search ? "Aucun résultat" : "Aucun remboursement"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search 
                  ? "Essayez de modifier votre recherche"
                  : "Les remboursements apparaîtront ici"
                }
              </Text>
              {!search && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.emptyButtonText}>Ajouter le premier</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        ) : (
          <FlatList
            data={filteredRepayments}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <RepaymentCard item={item} index={index} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[GREEN_THEME.primary]}
                tintColor={GREEN_THEME.primary}
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 200,
              offset: 200 * index,
              index,
            })}
          />
        )}
      </View>

      {/* Modal d'ajout */}
      <AddRepaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddRepayment}
        loading={createRepayment.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
  headerContent: {
    paddingTop: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  headerIcon: {
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: 'white',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  counterContainer: {
    alignItems: 'center',
  },
  counterText: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Search
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInputFocused: {
    borderColor: GREEN_THEME.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    margin: SPACING.lg,
  },
  emptyGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: GREEN_THEME.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    backgroundColor: GREEN_THEME.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },

  // Repayment Cards
  repaymentCard: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN_THEME.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  memberAvatarDisabled: {
    backgroundColor: COLORS.border,
  },
  memberInitials: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: GREEN_THEME.primary,
  },
  memberInitialsDisabled: {
    color: COLORS.textLight,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  memberNameDisabled: {
    color: COLORS.textLight,
  },
  memberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  memberNumberDisabled: {
    color: COLORS.textLight,
  },
  memberEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  memberEmailDisabled: {
    color: COLORS.textLight,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: GREEN_THEME.primary,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardDetails: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_THEME.light,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  notesText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: GREEN_THEME.primary,
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    width: 40,
    alignItems: 'center',
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    color: GREEN_THEME.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  modalStep: {
    flex: 1,
    paddingVertical: SPACING.lg,
  },
  modalStepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },

  // Members list
  membersList: {
    flex: 1,
    marginTop: SPACING.md,
  },
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memberCardDisabled: {
    opacity: 0.6,
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  memberStatus: {
    alignItems: 'flex-end',
  },
  hasLoanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_THEME.light,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  hasLoanText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: GREEN_THEME.primary,
    fontWeight: '500',
  },
  noLoanBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  noLoanText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },

  // Loan info card
  loanInfoCard: {
    marginBottom: SPACING.lg,
  },
  loanInfoGradient: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  loanInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  loanInfoTitle: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: GREEN_THEME.primary,
  },
  loanInfoDetails: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  loanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  loanInfoRowHighlight: {
    backgroundColor: GREEN_THEME.light,
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 0,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  loanInfoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  loanInfoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  loanInfoLabelHighlight: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: GREEN_THEME.primary,
  },
  loanInfoValueHighlight: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: GREEN_THEME.primary,
  },

  // Form
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modalInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: FONT_SIZES.sm,
    color: GREEN_THEME.primary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },

  // Buttons
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    
  },
  backButtonText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: GREEN_THEME.primary,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_THEME.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
    
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: 'white',
    fontWeight: '600',
  },

  // Empty state in modal
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});