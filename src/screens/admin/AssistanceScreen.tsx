import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  ListRenderItem,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAssistances, useAssistance, useCreateAssistances, useCreateAssistance, useAssistanceType } from "../../hooks/useAssistance";
import { useMembers } from "../../hooks/useMember";
import { useSocialFundCurrent } from "../../hooks/useSolidarity";
import { Assistance } from "../../types/assistance.types";
import { Member } from "../../types/member.types";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useNavigation } from "@react-navigation/native";
import { ScrollView } from "react-native";
import { useAuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get("window");
// 🎯 Configuration de la pagination
const ITEMS_PER_PAGE = 10;
const MODAL_ITEMS_PER_PAGE = 10; // Pour les listes dans le modal

// 🎯 Types
interface AssistanceType {
  id: string;
  nom: string;
  montant: number;
  description: string;
  actif: boolean;
}

// 🎯 Formatage monétaire sécurisé
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 FCFA";
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};

// 🎯 Composant StatCard
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}

const StatCard = ({ title, value, icon, color, subtitle, onPress }: StatCardProps) => (
  <TouchableOpacity
    style={[styles.statCard, { borderLeftColor: color }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.8 : 1}
  >
    <View style={styles.statHeader}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  </TouchableOpacity>
);

// 🎯 Composant AssistanceCard
interface AssistanceCardProps {
  item: Assistance;
  onPress?: () => void;
}

const AssistanceCard = ({ item, onPress }: AssistanceCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAYEE": return COLORS.success;
      case "APPROUVEE": return COLORS.warning;
      case "DEMANDEE": return COLORS.primary;
      case "REJETEE": return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAYEE": return "checkmark-circle";
      case "APPROUVEE": return "hourglass";
      case "DEMANDEE": return "time";
      case "REJETEE": return "close-circle";
      default: return "help-circle";
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.assistanceCard, { borderLeftColor: getStatusColor(item.statut) }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header avec type et statut */}
      <View style={styles.cardHeader}>
        <View style={styles.assistanceTypeContainer}>
          <Ionicons name="heart" size={20} color="#7209B7" />
          <Text style={styles.assistanceType}>
            {item.type_assistance_info?.nom || "Type non défini"}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statut) }]}>
          <Ionicons 
            name={getStatusIcon(item.statut) as any} 
            size={14} 
            color="white" 
            style={{ marginRight: 4 }}
          />
          <Text style={styles.statusText}>{item.statut_display}</Text>
        </View>
      </View>

      {/* Informations membre */}
      <View style={styles.memberSection}>
        <View style={styles.memberInfo}>
          <Ionicons name="person" size={16} color={COLORS.textSecondary} />
          <Text style={styles.memberName}>
            {item.membre_info?.nom_complet || "Membre non défini"}
          </Text>
        </View>
        <Text style={styles.memberNumber}>
          {item.membre_info?.numero_membre || "N/A"}
        </Text>
      </View>

      {/* Informations financières */}
      <View style={styles.financialSection}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Montant:</Text>
          <Text style={styles.amountValue}>{formatCurrency(item.montant)}</Text>
        </View>
        <View style={styles.sessionContainer}>
          <Ionicons name="calendar" size={14} color={COLORS.textSecondary} />
          <Text style={styles.sessionText}>{item.session_nom || "Session N/A"}</Text>
        </View>
      </View>

      {/* Dates */}
      <View style={styles.datesSection}>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>
            Demandée: {item.date_demande ? new Date(item.date_demande).toLocaleDateString('fr-FR') : "N/A"}
          </Text>
        </View>
        {item.date_paiement && (
          <View style={styles.dateRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.success} />
            <Text style={styles.dateText}>
              Payée: {new Date(item.date_paiement).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        )}
      </View>

      {/* Justification */}
      {item.justification && (
        <View style={styles.justificationSection}>
          <Text style={styles.justificationLabel}>Justification:</Text>
          <Text style={styles.justificationText} numberOfLines={2}>
            {item.justification}
          </Text>
        </View>
      )}

      {/* Notes */}
      {item.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// 🎯 Composant principal
export default function AssistanceScreen() {
  const { user } = useAuthContext();
  const readOnly = !user?.can_write; // true pour Trésorier et Président
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedType, setSelectedType] = useState<AssistanceType | null>(null);
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [searchMember, setSearchMember] = useState("");
  const [searchType, setSearchType] = useState("");
  
  // États de pagination
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  const [displayedMembers, setDisplayedMembers] = useState(MODAL_ITEMS_PER_PAGE);
  const [displayedTypes, setDisplayedTypes] = useState(MODAL_ITEMS_PER_PAGE);

  // Hooks de données
  const { data: assistancesData, isLoading, isError, refetch } = useAssistance();
  const createAssistance = useCreateAssistances();
  const { data: membersData, isLoading: loadingMembers } = useMembers({ statut: "EN_REGLE" });
  const { data: typesData, isLoading: loadingTypes } = useAssistanceType();
  const { data: socialFund } = useSocialFundCurrent();
  const navigation = useNavigation();

  // 🔧 Protection des données avec types corrects
  const assistances: Assistance[] = useMemo(() => {
    if (Array.isArray(assistancesData)) {
      return assistancesData;
    }
    if (assistancesData && Array.isArray((assistancesData as any).results)) {
      return (assistancesData as any).results;
    }
    return [];
  }, [assistancesData]);

  const members: Member[] = useMemo(() => {
    if (Array.isArray(membersData)) {
      return membersData;
    }
    if (membersData && Array.isArray((membersData as any).results)) {
      return (membersData as any).results;
    }
    return [];
  }, [membersData]);

  const types: AssistanceType[] = useMemo(() => {
    if (Array.isArray(typesData)) {
      return typesData;
    }
    if (typesData && Array.isArray((typesData as any).results)) {
      return (typesData as any).results;
    }
    return [];
  }, [typesData]);

  // Filtrage sécurisé des assistances
  const filteredAssistances = useMemo(() => {
    if (!search.trim()) return assistances;
    
    return assistances.filter((item) => {
      const searchStr = [
        item.statut_display,
        item.type_assistance_info?.nom,
        item.membre_info?.nom_complet,
        item.membre_info?.numero_membre,
        item.session_nom,
        item.justification,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return searchStr.includes(search.toLowerCase());
    });
  }, [assistances, search]);

  // Pagination des assistances
  const paginatedAssistances = useMemo(() => {
    return filteredAssistances.slice(0, displayedItems);
  }, [filteredAssistances, displayedItems]);

  const hasMoreAssistances = displayedItems < filteredAssistances.length;

  const loadMoreAssistances = () => {
    setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, filteredAssistances.length));
  };

  // Reset pagination when search changes
  useMemo(() => {
    setDisplayedItems(ITEMS_PER_PAGE);
  }, [search]);

  // Calculs financiers
  const dispoFonds = socialFund?.montant_total || 0;
  const montantAssistance = useMemo(() => {
    const parsed = Number(String(amount).replace(/\s+/g, "").replace(',','.'));
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return selectedType?.montant || 0;
  }, [amount, selectedType]);
  const resteFonds = dispoFonds - montantAssistance;
  const manque = resteFonds < 0 ? Math.abs(resteFonds) : 0;
  const fondsOk = montantAssistance > 0 && resteFonds >= 0;

  // Statistiques
  const stats = useMemo(() => {
    const total = assistances.length;
    const payees = assistances.filter(a => a.statut === "PAYEE").length;
    const enCours = assistances.filter(a => a.statut === "DEMANDEE" || a.statut === "APPROUVEE").length;
    const montantTotal = assistances
      .filter(a => a.statut === "PAYEE")
      .reduce((sum, a) => sum + (a.montant || 0), 0);

    return { total, payees, enCours, montantTotal };
  }, [assistances]);

  // Filtres pour les sélecteurs du modal
  const filteredMembers = useMemo(() => {
    let list = members.filter((m) => {
      const estEnRegle = m.statut === "EN_REGLE";
      const inscriptionComplete = m.donnees_financieres?.inscription?.inscription_complete === true;
      return estEnRegle && inscriptionComplete;
    });
  
    return list.filter((member) => {
      const searchStr = [
        member.utilisateur?.nom_complet,
        member.numero_membre,
        member.utilisateur?.email,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return searchStr.includes(searchMember.toLowerCase());
    });
  }, [members, searchMember]);

  // Pagination des membres
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice(0, displayedMembers);
  }, [filteredMembers, displayedMembers]);

  const hasMoreMembers = displayedMembers < filteredMembers.length;

  const loadMoreMembers = () => {
    setDisplayedMembers(prev => Math.min(prev + MODAL_ITEMS_PER_PAGE, filteredMembers.length));
  };

  const filteredTypes = useMemo(() => {
    if (!searchType.trim()) return types;
    
    return types.filter((type) => {
      const searchStr = [type.nom, type.description].filter(Boolean).join(" ").toLowerCase();
      return searchStr.includes(searchType.toLowerCase());
    });
  }, [types, searchType]);

  // Pagination des types
  const paginatedTypes = useMemo(() => {
    return filteredTypes.slice(0, displayedTypes);
  }, [filteredTypes, displayedTypes]);

  const hasMoreTypes = displayedTypes < filteredTypes.length;

  const loadMoreTypes = () => {
    setDisplayedTypes(prev => Math.min(prev + MODAL_ITEMS_PER_PAGE, filteredTypes.length));
  };

  // Reset pagination des modals quand recherche change
  useMemo(() => {
    setDisplayedMembers(MODAL_ITEMS_PER_PAGE);
  }, [searchMember]);

  useMemo(() => {
    setDisplayedTypes(MODAL_ITEMS_PER_PAGE);
  }, [searchType]);

  // Actions
  const handleOpenAdd = () => {
    setShowAddModal(true);
    setModalStep(1);
    setSelectedMember(null);
    setSelectedType(null);
    setJustification("");
    setNotes("");
    setAmount("");
    setSearchMember("");
    setSearchType("");
    setDisplayedMembers(MODAL_ITEMS_PER_PAGE);
    setDisplayedTypes(MODAL_ITEMS_PER_PAGE);
  };

  const handleCreateAssistance = () => {
    if (!selectedMember?.id) {
      Alert.alert("Erreur", "Veuillez sélectionner un membre.");
      return;
    }

    if (!selectedType?.id) {
      Alert.alert("Erreur", "Veuillez sélectionner un type d'assistance.");
      return;
    }

    if (!justification.trim()) {
      Alert.alert("Erreur", "La justification est obligatoire.");
      return;
    }

    const montantFinal = montantAssistance;

    if (montantFinal <= 0 || isNaN(montantFinal)) {
      Alert.alert("Erreur", "Montant invalide.");
      return;
    }

    const fondsApres = dispoFonds - montantFinal;

    if (fondsApres < 0) {
      Alert.alert(
        "Fonds insuffisants",
        `Montant disponible : ${formatCurrency(dispoFonds)}\nMontant demandé : ${formatCurrency(montantFinal)}\n\nManque : ${formatCurrency(Math.abs(fondsApres))}`,
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    const nomMembre = selectedMember.utilisateur?.nom_complet || "—";

    // Créer directement l'assistance sans alerte de confirmation
    createAssistance.mutate(
      {
        membre: selectedMember.id,
        type_assistance: selectedType.id,
        montant: montantFinal,
        justification: justification.trim(),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setModalStep(1);
          setSelectedMember(null);
          setSelectedType(null);
          setJustification("");
          setNotes("");
          setAmount("");
          refetch();

          Alert.alert(
            "Succès",
            `Assistance de ${formatCurrency(montantFinal)} enregistrée pour ${nomMembre} !`
          );
        },
        onError: (err: any) => {
          console.error("Erreur création assistance:", err);
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.details ||
            err?.message ||
            "Impossible d'enregistrer l'assistance";
          Alert.alert("Erreur", msg);
        },
      }
    );
  };

  const closeModal = () => {
    setShowAddModal(false);
    setModalStep(1);
    setSelectedMember(null);
    setSelectedType(null);
    setJustification("");
    setNotes("");
    setAmount("");
    setSearchMember("");
    setSearchType("");
    setDisplayedMembers(MODAL_ITEMS_PER_PAGE);
    setDisplayedTypes(MODAL_ITEMS_PER_PAGE);
  };

  const handleTypeSelect = (type: AssistanceType) => {
    setSelectedType(type);
    setAmount(String(type.montant));
  };

  // 🔧 Render du contenu principal
  const renderMainContent = () => (
    <View>
      {/* Section statistiques */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total assistances"
            value={stats.total.toString()}
            icon="list"
            color={COLORS.primary}
            subtitle="Toutes demandes"
          />
          <StatCard
            title="Fonds disponible"
            value={formatCurrency(dispoFonds)}
            icon="wallet"
            color={dispoFonds > 0 ? COLORS.success : COLORS.error}
            subtitle="Solidarité"
          />
          <StatCard
            title="Assistances payées"
            value={stats.payees.toString()}
            icon="checkmark-circle"
            color={COLORS.success}
            subtitle={formatCurrency(stats.montantTotal)}
          />
          <StatCard
            title="En cours"
            value={stats.enCours.toString()}
            icon="hourglass"
            color={COLORS.warning}
            subtitle="À traiter"
          />
        </View>
      </View>

      {/* Section recherche et actions */}
      <View style={styles.searchSection}>
        <View style={styles.searchHeader}>
          <Text style={styles.sectionTitle}>
            Assistances ({filteredAssistances.length})
          </Text>
          {!readOnly && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleOpenAdd}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Nouvelle</Text>
            </TouchableOpacity>
         )}
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par membre, type, statut..."
            placeholderTextColor={COLORS.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Compteur de résultats */}
      {!isLoading && filteredAssistances.length > 0 && (
        <View style={styles.resultsCounter}>
          <Ionicons name="heart" size={18} color="#7209B7" />
          <Text style={styles.resultsCounterText}>
            Affichage de <Text style={styles.resultsCounterBold}>{paginatedAssistances.length}</Text> sur{' '}
            <Text style={styles.resultsCounterBold}>{filteredAssistances.length}</Text> assistance{filteredAssistances.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* États de chargement/erreur */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des assistances...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>
            Impossible de charger les assistances.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAssistances.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune assistance</Text>
          <Text style={styles.emptyText}>
            {search ? "Aucun résultat pour votre recherche." : "Aucune assistance enregistrée."}
          </Text>
          {!search && !readOnly && (
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={handleOpenAdd}
            >
              <Text style={styles.emptyActionText}>Créer la première assistance</Text>
            </TouchableOpacity>
         )}
        </View>
      ) : (
        // Liste des assistances avec pagination
        <View style={{ paddingHorizontal: SPACING.lg, marginVertical: SPACING.lg }}>
          {paginatedAssistances.map((item, index) => (
            <View key={item.id} style={{ marginBottom: SPACING.md }}>
              <AssistanceCard item={item} />
            </View>
          ))}

          {/* Bouton "Voir plus" */}
          {hasMoreAssistances && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreAssistances}>
              <LinearGradient
                colors={["#7209B7", "#9D4EDD"]}
                style={styles.loadMoreGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loadMoreText}>
                  Voir plus ({filteredAssistances.length - displayedItems} restant{filteredAssistances.length - displayedItems > 1 ? 's' : ''})
                </Text>
                <Ionicons name="chevron-down" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={{ height: SPACING.xxl }} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header figé ── */}
      <LinearGradient
        colors={["#7209B7", "#9D4EDD"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="heart" size={32} color="white" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Gestion des Assistances</Text>
          <Text style={styles.headerSubtitle}>
            Mariages, décès, promotions et événements spéciaux
          </Text>
        </View>
      </LinearGradient>

      {/* ── Contenu scrollable ── */}
      <FlatList
        data={[{ type: 'content' }]}
        keyExtractor={() => 'main-content'}
        renderItem={renderMainContent}
        showsVerticalScrollIndicator={false}
      />

      {/* ═══ MODAL MULTI-STEP ═══ */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={ms.overlay}>
            <View style={ms.sheet}>

              {/* ── Header avec indicateur d'étapes ── */}
              <LinearGradient colors={["#7209B7", "#9D4EDD"]} style={ms.header}>
                <View style={ms.stepBar}>
                  {([1, 2, 3, 4] as const).map((s) => {
                    const currentStep = modalStep;
                    const done   = currentStep > s;
                    const active = currentStep === s;
                    return (
                      <View key={s} style={ms.stepBarItem}>
                        <View style={[ms.stepDot, (done || active) && ms.stepDotActive]}>
                          {done
                            ? <Ionicons name="checkmark" size={11} color="#7209B7" />
                            : <Text style={[ms.stepNum, active && { color: "#7209B7" }]}>{s}</Text>}
                        </View>
                        {s < 4 && <View style={[ms.stepLine, done && ms.stepLineActive]} />}
                      </View>
                    );
                  })}
                </View>
                <View style={ms.headerRow}>
                  <TouchableOpacity onPress={closeModal} style={ms.closeBtn}>
                    <Ionicons name="close" size={22} color="white" />
                  </TouchableOpacity>
                  <Text style={ms.headerTitle}>
                    {modalStep === 1 ? "Choisir un membre"
                    : modalStep === 2 ? "Type d'assistance"
                    : modalStep === 3 ? "Détails"
                    : "Confirmer"}
                  </Text>
                  <View style={{ width: 36 }} />
                </View>
              </LinearGradient>

              {/* ══ STEP 1 : Choisir le membre ══ */}
              {modalStep === 1 && (
                <>
                  <View style={ms.searchBox}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput
                      style={ms.searchInput}
                      value={searchMember}
                      onChangeText={setSearchMember}
                      placeholder="Rechercher par nom, numéro, email…"
                      placeholderTextColor={COLORS.textLight}
                      autoFocus
                    />
                    {searchMember.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchMember("")}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={ms.resultCount}>
                    {filteredMembers.length} membre{filteredMembers.length !== 1 ? "s" : ""}
                  </Text>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.listPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {loadingMembers ? (
                      <View style={ms.center}>
                        <ActivityIndicator size="large" color="#7209B7" />
                      </View>
                    ) : filteredMembers.length === 0 ? (
                      <View style={ms.center}>
                        <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                        <Text style={ms.emptyText}>Aucun membre trouvé</Text>
                      </View>
                    ) : (
                      <>
                        {paginatedMembers.map((member) => (
                          <TouchableOpacity
                            key={member.id}
                            style={ms.memberCard}
                            onPress={() => { setSelectedMember(member); setModalStep(2); }}
                            activeOpacity={0.8}
                          >
                            <View style={ms.memberAvatar}>
                              <Text style={ms.memberInitials}>
                                {(member.utilisateur?.nom_complet ?? "??").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={ms.memberName}>{member.utilisateur?.nom_complet}</Text>
                              <Text style={ms.memberNumero}>{member.numero_membre}</Text>
                              <Text style={ms.memberEmail} numberOfLines={1}>{member.utilisateur?.email}</Text>
                            </View>
                            <View style={[ms.statusBadge, { backgroundColor: (member.statut === "EN_REGLE" ? COLORS.success : COLORS.warning) + "20" }]}>
                              <Text style={[ms.statusText, { color: member.statut === "EN_REGLE" ? COLORS.success : COLORS.warning }]}>
                                {member.statut === "EN_REGLE" ? "En règle" : member.statut}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        {hasMoreMembers && (
                          <TouchableOpacity style={ms.loadMore} onPress={loadMoreMembers}>
                            <Text style={ms.loadMoreText}>
                              Voir plus ({filteredMembers.length - displayedMembers} restant{filteredMembers.length - displayedMembers > 1 ? "s" : ""})
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#7209B7" />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </>
              )}

              {/* ══ STEP 2 : Choisir le type d'assistance ══ */}
              {modalStep === 2 && (
                <>
                  {/* Mini-bannière membre */}
                  <LinearGradient colors={["#7209B715", "#9D4EDD08"]} style={ms.banner}>
                    <View style={[ms.memberAvatar, { width: 38, height: 38, borderRadius: 19 }]}>
                      <Text style={[ms.memberInitials, { fontSize: FONT_SIZES.sm }]}>
                        {(selectedMember?.utilisateur?.nom_complet ?? "??").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ms.bannerName}>{selectedMember?.utilisateur?.nom_complet}</Text>
                      <Text style={ms.bannerSub}>{selectedMember?.numero_membre}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedMember(null); setModalStep(1); }} style={ms.changeBtn}>
                      <Text style={ms.changeBtnText}>Changer</Text>
                    </TouchableOpacity>
                  </LinearGradient>

                  <View style={ms.searchBox}>
                    <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                    <TextInput
                      style={ms.searchInput}
                      value={searchType}
                      onChangeText={setSearchType}
                      placeholder="Rechercher un type d'assistance…"
                      placeholderTextColor={COLORS.textLight}
                      autoFocus
                    />
                    {searchType.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchType("")}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={ms.resultCount}>
                    {filteredTypes.length} type{filteredTypes.length !== 1 ? "s" : ""}
                  </Text>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.listPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {loadingTypes ? (
                      <View style={ms.center}>
                        <ActivityIndicator size="large" color="#7209B7" />
                      </View>
                    ) : filteredTypes.length === 0 ? (
                      <View style={ms.center}>
                        <Ionicons name="help-circle-outline" size={48} color={COLORS.textLight} />
                        <Text style={ms.emptyText}>Aucun type trouvé</Text>
                      </View>
                    ) : (
                      <>
                        {paginatedTypes.map((type) => (
                          <TouchableOpacity
                            key={type.id}
                            style={ms.typeCard}
                            onPress={() => { handleTypeSelect(type); setModalStep(3); }}
                            activeOpacity={0.8}
                          >
                            <LinearGradient colors={["#7209B720", "#9D4EDD10"]} style={ms.typeIconCircle}>
                              <Ionicons name="heart" size={20} color="#7209B7" />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                              <Text style={ms.typeName}>{type.nom}</Text>
                              {type.description ? (
                                <Text style={ms.typeDesc} numberOfLines={2}>{type.description}</Text>
                              ) : null}
                            </View>
                            <View style={ms.typeAmountBadge}>
                              <Text style={ms.typeAmountText}>{formatCurrency(type.montant)}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        {hasMoreTypes && (
                          <TouchableOpacity style={ms.loadMore} onPress={loadMoreTypes}>
                            <Text style={ms.loadMoreText}>
                              Voir plus ({filteredTypes.length - displayedTypes} restant{filteredTypes.length - displayedTypes > 1 ? "s" : ""})
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#7209B7" />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </>
              )}

              {/* ══ STEP 3 : Montant + Justification ══ */}
              {modalStep === 3 && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.stepPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {/* Bannières membre + type */}
                  <LinearGradient colors={["#7209B715", "#9D4EDD08"]} style={ms.banner}>
                    <View style={[ms.memberAvatar, { width: 38, height: 38, borderRadius: 19 }]}>
                      <Text style={[ms.memberInitials, { fontSize: FONT_SIZES.sm }]}>
                        {(selectedMember?.utilisateur?.nom_complet ?? "??").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ms.bannerName}>{selectedMember?.utilisateur?.nom_complet}</Text>
                      <Text style={ms.bannerSub}>{selectedType?.nom} · {formatCurrency(selectedType?.montant)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedType(null); setModalStep(2); }} style={ms.changeBtn}>
                      <Text style={ms.changeBtnText}>Changer</Text>
                    </TouchableOpacity>
                  </LinearGradient>

                  {/* Montant */}
                  <Text style={ms.label}>Montant <Text style={{ color: COLORS.error }}>*</Text></Text>
                  <View style={ms.amountBox}>
                    <TextInput
                      style={ms.amountInput}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder={String(selectedType?.montant)}
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textLight}
                      autoFocus
                      editable={false}
                    />
                    <Text style={ms.amountUnit}>FCFA</Text>
                  </View>

                  {/* Info fonds */}
                  <LinearGradient colors={["#7209B715", "#9D4EDD08"]} style={ms.fundBox}>
                    <View style={ms.fundRow2}>
                      <Text style={ms.fundLabel2}>Montant demandé</Text>
                      <Text style={[ms.fundVal2, { color: "#7209B7" }]}>{formatCurrency(montantAssistance)}</Text>
                    </View>
                    <View style={ms.fundRow2}>
                      <Text style={ms.fundLabel2}>Fonds disponibles</Text>
                      <Text style={[ms.fundVal2, { color: dispoFonds >= montantAssistance ? COLORS.success : COLORS.error }]}>{formatCurrency(dispoFonds)}</Text>
                    </View>
                    <View style={[ms.fundRow2, { borderTopWidth: 1, borderTopColor: "#7209B720", paddingTop: 6, marginTop: 4 }]}>
                      <Text style={[ms.fundLabel2, { fontWeight: "700" }]}>Reste après paiement</Text>
                      <Text style={[ms.fundVal2, { fontWeight: "800", color: resteFonds >= 0 ? COLORS.success : COLORS.error }]}>{formatCurrency(resteFonds)}</Text>
                    </View>
                    {manque > 0 && (
                      <View style={ms.warnRow}>
                        <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                        <Text style={ms.warnText}>Il manque {formatCurrency(manque)}</Text>
                      </View>
                    )}
                  </LinearGradient>

                  {/* Justification */}
                  <Text style={[ms.label, { marginTop: SPACING.md }]}>
                    Justification <Text style={{ color: COLORS.error }}>*</Text>
                  </Text>
                  <TextInput
                    style={ms.textArea}
                    value={justification}
                    onChangeText={setJustification}
                    placeholder="Expliquez la raison de cette assistance…"
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={COLORS.textLight}
                  />

                  {/* Notes */}
                  <Text style={[ms.label, { marginTop: SPACING.md }]}>Notes (optionnel)</Text>
                  <TextInput
                    style={[ms.textArea, { height: 70 }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes administratives internes…"
                    multiline
                    numberOfLines={2}
                    placeholderTextColor={COLORS.textLight}
                  />

                  <View style={ms.navRow}>
                    <TouchableOpacity style={ms.backBtn} onPress={() => { setSelectedType(null); setModalStep(2); }}>
                      <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                      <Text style={ms.backBtnText}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[ms.nextBtn, (!justification.trim() || montantAssistance <= 0) && { opacity: 0.4 }]}
                      onPress={() => setModalStep(4)}
                      disabled={!justification.trim() || montantAssistance <= 0}
                    >
                      <LinearGradient colors={["#7209B7", "#9D4EDD"]} style={ms.nextBtnGrad}>
                        <Text style={ms.nextBtnText}>Continuer</Text>
                        <Ionicons name="arrow-forward" size={18} color="white" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}

              {/* ══ STEP 4 : Résumé + Validation ══ */}
              {modalStep === 4 && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={ms.stepPad} showsVerticalScrollIndicator={false}>
                  <Text style={ms.resumeTitle}>Récapitulatif</Text>
                  <View style={ms.resumeCard}>
                    <RRow icon="person"          label="Membre"          value={selectedMember?.utilisateur?.nom_complet ?? "—"} />
                    <RRow icon="card"            label="Numéro"          value={selectedMember?.numero_membre} />
                    <RRow icon="heart"           label="Type"            value={selectedType?.nom} />
                    <View style={ms.divider} />
                    <RRow icon="cash"            label="Montant"         value={formatCurrency(montantAssistance)} valueColor="#7209B7" bold />
                    <RRow icon="wallet"          label="Fonds avant"     value={formatCurrency(dispoFonds)} />
                    <RRow icon="trending-down"   label="Fonds après"     value={formatCurrency(resteFonds)} valueColor={resteFonds >= 0 ? COLORS.success : COLORS.error} />
                    <View style={ms.divider} />
                    <RRow icon="chatbubble-ellipses" label="Justification" value={justification.trim()} />
                    {notes.trim() && <RRow icon="document-text" label="Notes" value={notes.trim()} />}
                  </View>

                  {manque > 0 && (
                    <View style={ms.warnBox}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                      <Text style={ms.warnText}>⚠️ Fonds insuffisants — il manque {formatCurrency(manque)}</Text>
                    </View>
                  )}

                  <View style={ms.navRow}>
                    <TouchableOpacity style={ms.backBtn} onPress={() => setModalStep(3)}>
                      <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                      <Text style={ms.backBtnText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[ms.nextBtn, (createAssistance.isPending || !fondsOk) && { opacity: 0.5 }]}
                      onPress={handleCreateAssistance}
                      disabled={createAssistance.isPending || !fondsOk}
                    >
                      <LinearGradient colors={[COLORS.success, "#059669"]} style={ms.nextBtnGrad}>
                        {createAssistance.isPending
                          ? <ActivityIndicator size="small" color="white" />
                          : <>
                              <Ionicons name="checkmark-circle" size={18} color="white" />
                              <Text style={ms.nextBtnText}>Valider</Text>
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
    </SafeAreaView>
  );
}

// ─── Styles multi-step modal ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
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
  headerContent: {
    alignItems: "center",
    width: "100%",
  },
  headerIcon: {
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },

  // Stats Section
  statsSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    marginBottom: SPACING.xs,
  },
  statSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7209B7",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  addButtonText: {
    color: "white",
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },

  // Results Counter
  resultsCounter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: "#7209B720",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  resultsCounterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  resultsCounterBold: {
    fontWeight: "bold",
    color: "#7209B7",
  },

  // Assistance Card
  assistanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  assistanceTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
  },
  assistanceType: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "#7209B7",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    color: "white",
    fontWeight: "600",
  },
  memberSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  memberNumber: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: "500",
  },
  financialSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  amountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  amountValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  sessionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  sessionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  datesSection: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  justificationSection: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  justificationLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  justificationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  notesSection: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  notesLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: "italic",
  },

  // Load More Button
  loadMoreButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#7209B7",
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
  emptyActionText: {
  color: "white",
  fontSize: FONT_SIZES.md,
  fontWeight: "600",
},
  emptyActionButton: {
    backgroundColor: "#7209B7",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
    loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  retryButtonText: {
    color: "white",
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },

  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },

  overlay:        { flex: 1, justifyContent: "flex-end" },
  sheet:          { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "90%", overflow: "hidden" },
  stepBar:        { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  stepBarItem:    { flexDirection: "row", alignItems: "center" },
  stepDot:        { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  stepDotActive:  { backgroundColor: "white" },
  stepNum:        { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  stepLine:       { width: 28, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 3 },
  stepLineActive: { backgroundColor: "white" },
  headerRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  searchBox:      { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: SPACING.lg, marginBottom: SPACING.sm, borderRadius: 14, paddingHorizontal: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  resultCount:    { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  listPad:        { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  stepPad:        { paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: SPACING.sm },
  center:         { alignItems: "center", paddingVertical: 40 },
  emptyText:      { fontSize: FONT_SIZES.md, color: COLORS.textLight, marginTop: SPACING.md },
  memberCard:     { backgroundColor: "white", borderRadius: 14, padding: SPACING.md, flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm, borderWidth: 1, borderColor: "#E9D8FD", elevation: 1 },
  memberAvatar:   { width: 46, height: 46, borderRadius: 23, backgroundColor: "#7209B7", alignItems: "center", justifyContent: "center" },
  memberInitials: { color: "white", fontWeight: "800", fontSize: FONT_SIZES.md },
  memberNumero:   { fontSize: FONT_SIZES.sm, color: "#7209B7", fontWeight: "600" },
  memberEmail:    { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  typeCard:       { backgroundColor: "white", borderRadius: 14, padding: SPACING.md, flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm, gap: SPACING.sm, borderWidth: 1, borderColor: "#E9D8FD", elevation: 1 },
  typeIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  typeName:       { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  typeDesc:       { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  typeAmountBadge:{ backgroundColor: "#7209B715", paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 10 },
  typeAmountText: { fontSize: FONT_SIZES.sm, fontWeight: "800", color: "#7209B7" },
  loadMore:       { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.md, gap: 6 },
  loadMoreText:   { fontSize: FONT_SIZES.sm, color: "#7209B7", fontWeight: "600" },
  banner:         { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: SPACING.md, marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  bannerName:     { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  bannerSub:      { fontSize: FONT_SIZES.sm, color: "#7209B7" },
  changeBtn:      { backgroundColor: "white", paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#7209B740" },
  changeBtnText:  { fontSize: 12, color: "#7209B7", fontWeight: "600" },
  label:          { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm },
  amountBox:      { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 16, borderWidth: 2, borderColor: "#7209B740", paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  amountInput:    { flex: 1, fontSize: 28, fontWeight: "800", color: COLORS.text, paddingVertical: SPACING.md },
  amountUnit:     { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, fontWeight: "600" },
  fundBox:        { borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md },
  fundRow2:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  fundLabel2:     { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  fundVal2:       { fontSize: FONT_SIZES.sm, fontWeight: "700" },
  warnRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  warnBox:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.error + "10", borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.md },
  warnText:       { fontSize: FONT_SIZES.sm, color: COLORS.error, flex: 1 },
  textArea:       { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONT_SIZES.md, color: COLORS.text, height: 100, textAlignVertical: "top" },
  navRow:         { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },
  backBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  backBtnText:    { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.textSecondary },
  nextBtn:        { flex: 2, borderRadius: 14, overflow: "hidden" },
  nextBtnGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, paddingVertical: SPACING.md },
  nextBtnText:    { fontSize: FONT_SIZES.md, fontWeight: "700", color: "white" },
  resumeTitle:    { fontSize: FONT_SIZES.lg, fontWeight: "800", color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.md },
  resumeCard:     { backgroundColor: "white", borderRadius: 18, padding: SPACING.lg, borderWidth: 1, borderColor: "#E9D8FD", marginBottom: SPACING.lg },
  divider:        { height: 1, backgroundColor: "#F0F0F0", marginVertical: SPACING.sm },
});

const ms =styles;

const RRow = ({ icon, label, value, valueColor, bold }: { icon: string; label: string; value?: string; valueColor?: string; bold?: boolean }) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}>
    <Ionicons name={icon as any} size={16} color={COLORS.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
    <Text style={{ flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary }}>{label}</Text>
    <Text style={{ fontSize: FONT_SIZES.sm, color: valueColor || COLORS.text, fontWeight: bold ? "800" : "600", textAlign: "right", maxWidth: "55%" }}>{value}</Text>
  </View>
);