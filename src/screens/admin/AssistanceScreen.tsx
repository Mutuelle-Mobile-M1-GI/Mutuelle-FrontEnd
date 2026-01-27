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
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
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
    if (assistancesData && Array.isArray(assistancesData.results)) {
      return assistancesData.results;
    }
    return [];
  }, [assistancesData]);

  const members: Member[] = useMemo(() => {
    if (Array.isArray(membersData)) {
      return membersData;
    }
    if (membersData && Array.isArray(membersData.results)) {
      return membersData.results;
    }
    return [];
  }, [membersData]);

  const types: AssistanceType[] = useMemo(() => {
    if (Array.isArray(typesData)) {
      return typesData;
    }
    if (typesData && Array.isArray(typesData.results)) {
      return typesData.results;
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
    if (!searchMember.trim()) return members;
    
    return members.filter((member) => {
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

    const nomMembre = selectedMember.utilisateur?.nom_complet || selectedMember.nom_complet || "—";

    const recapMessage = [
      `RÉCAPITULATIF DE LA DEMANDE`,
      `────────────────`,
      `Membre          : ${nomMembre}`,
      `N° membre       : ${selectedMember.numero_membre || "—"}`,
      `Type d'aide     : ${selectedType.nom}`,
      `Montant         : ${formatCurrency(montantFinal)}`,
      ``,
      `Justification   : ${justification.trim().substring(0, 140)}${justification.length > 140 ? "..." : ""}`,
      notes.trim() ? `Notes           : ${notes.trim().substring(0, 100)}${notes.length > 100 ? "..." : ""}` : "",
      ``,
      `Fonds actuels   : ${formatCurrency(dispoFonds)}`,
      `Fonds après aide: ${formatCurrency(fondsApres)}`,
      fondsApres === 0 ? `\n→ Fonds épuisés après cette aide` : "",
    ].filter(Boolean).join("\n");

    Alert.alert(
      "Confirmer la création ?",
      recapMessage,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Valider et créer",
          style: "default",
          onPress: () => {
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
          },
        },
      ],
      { cancelable: true }
    );
  };

  const closeModal = () => {
    setShowAddModal(false);
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
      {/* Header avec gradient */}
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenAdd}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Nouvelle</Text>
          </TouchableOpacity>
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
          {!search && (
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
      <FlatList
        data={[{ type: 'content' }]}
        keyExtractor={() => 'main-content'}
        renderItem={renderMainContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal d'ajout */}
      <Modal 
        visible={showAddModal} 
        animationType="slide" 
        transparent={false}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.newModalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 60}
          >
            {/* Header Modal */}
            <View style={styles.newModalHeader}>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.newModalTitle}>Nouvelle Assistance</Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Créer une demande d'aide pour un membre
                </Text>
              </View>
            </View>

            <ScrollView 
              style={styles.newModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.newModalBodyContent}
            >
              {/* Sélection du membre */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>
                  Membre à assister <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchMember}
                    onChangeText={setSearchMember}
                    placeholder="Rechercher un membre..."
                    placeholderTextColor={COLORS.textLight}
                  />
                  {searchMember.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchMember("")}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Compteur de résultats membres */}
                {filteredMembers.length > 0 && (
                  <View style={styles.modalResultsCounter}>
                    <Text style={styles.modalResultsText}>
                      {paginatedMembers.length} sur {filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {loadingMembers ? (
                  <View style={styles.selectorLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Chargement...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.scrollableSelector} nestedScrollEnabled>
                    <View style={styles.simpleSelectorContainer}>
                      {paginatedMembers.map((member) => (
                        <TouchableOpacity
                          key={member.id}
                          style={[
                            styles.selectorItem,
                            { backgroundColor: selectedMember?.id === member.id ? `${COLORS.primary}20` : COLORS.surface }
                          ]}
                          onPress={() => setSelectedMember(member)}
                        >
                          <View style={styles.selectorItemContent}>
                            <View style={styles.selectorItemHeader}>
                              <Text style={styles.selectorItemName}>
                                {member.utilisateur?.nom_complet || "Nom non disponible"}
                              </Text>
                              <View style={[
                                styles.memberStatusBadge,
                                { backgroundColor: member.statut === "EN_REGLE" ? COLORS.success : COLORS.warning }
                              ]}>
                                <Text style={styles.memberStatusText}>{member.statut}</Text>
                              </View>
                            </View>
                            <Text style={styles.selectorItemSubtitle}>
                              {member.numero_membre} • {member.utilisateur?.email || "Email N/A"}
                            </Text>
                          </View>
                          {selectedMember?.id === member.id && (
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}

                      {/* Bouton voir plus membres */}
                      {hasMoreMembers && (
                        <TouchableOpacity style={styles.modalLoadMoreButton} onPress={loadMoreMembers}>
                          <Text style={styles.modalLoadMoreText}>
                            Voir plus ({filteredMembers.length - displayedMembers} restant{filteredMembers.length - displayedMembers > 1 ? 's' : ''})
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}

                      {filteredMembers.length === 0 && (
                        <View style={styles.emptySelector}>
                          <Text style={styles.emptySelectorText}>
                            {searchMember ? "Aucun membre trouvé" : "Aucun membre disponible"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* Sélection du type */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>
                  Type d'assistance <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={18} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchType}
                    onChangeText={setSearchType}
                    placeholder="Rechercher un type..."
                    placeholderTextColor={COLORS.textLight}
                  />
                  {searchType.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchType("")}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Compteur de résultats types */}
                {filteredTypes.length > 0 && (
                  <View style={styles.modalResultsCounter}>
                    <Text style={styles.modalResultsText}>
                      {paginatedTypes.length} sur {filteredTypes.length} type{filteredTypes.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {loadingTypes ? (
                  <View style={styles.selectorLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Chargement...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.scrollableSelector} nestedScrollEnabled>
                    <View style={styles.simpleSelectorContainer}>
                      {paginatedTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.selectorItem,
                            { backgroundColor: selectedType?.id === type.id ? `${COLORS.primary}20` : COLORS.surface }
                          ]}
                          onPress={() => handleTypeSelect(type)}
                        >
                          <View style={styles.selectorItemContent}>
                            <View style={styles.selectorItemHeader}>
                              <Text style={styles.selectorItemName}>{type.nom}</Text>
                              <Text style={[styles.typeAmount, { color: COLORS.primary }]}>
                                {formatCurrency(type.montant)} 
                              </Text>
                            </View>
                            {type.description && (
                              <Text style={styles.selectorItemSubtitle} numberOfLines={2}>
                                {type.description}
                              </Text>
                            )}
                          </View>
                          {selectedType?.id === type.id && (
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}

                      {/* Bouton voir plus types */}
                      {hasMoreTypes && (
                        <TouchableOpacity style={styles.modalLoadMoreButton} onPress={loadMoreTypes}>
                          <Text style={styles.modalLoadMoreText}>
                            Voir plus ({filteredTypes.length - displayedTypes} restant{filteredTypes.length - displayedTypes > 1 ? 's' : ''})
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}

                      {filteredTypes.length === 0 && (
                        <View style={styles.emptySelector}>
                          <Text style={styles.emptySelectorText}>
                            {searchType ? "Aucun type trouvé" : "Aucun type disponible"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* Montant personnalisé */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Montant personnalisé</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Montant par défaut du type sélectionné"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />
                <View style={styles.fundStatus}>
                  <View style={styles.fundRow}>
                    <Text style={styles.fundLabel}>Montant demandé:</Text>
                    <Text style={styles.fundValue}>{formatCurrency(montantAssistance)}</Text>
                  </View>

                  <View style={styles.fundRow}>
                    <Text style={styles.fundLabel}>Fonds disponibles:</Text>
                    <Text style={[styles.fundValue, { color: dispoFonds >= montantAssistance ? COLORS.success : COLORS.error }]}>{formatCurrency(dispoFonds)}</Text>
                  </View>

                  <View style={styles.fundRow}>
                    <Text style={styles.fundLabel}>Reste après paiement:</Text>
                    <Text style={[styles.fundValue, { color: resteFonds >= 0 ? COLORS.success : COLORS.error }]}>{formatCurrency(resteFonds)}</Text>
                  </View>

                  {(!fondsOk && manque > 0) && (
                    <View style={styles.fundWarning}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                      <Text style={[styles.fundWarningText, { color: COLORS.error }]}>Il manque {formatCurrency(manque)}</Text>
                    </View>
                  )}
                </View> 
              </View>

              {/* Justification */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  Justification <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={justification}
                  onChangeText={setJustification}
                  placeholder="Expliquez la raison de cette assistance..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Notes admin */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Notes administratives</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes internes (optionnel)..."
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Espacement pour que les boutons soient visibles */}
              <View style={styles.formBottomSpacing} />
            </ScrollView>

            {/* Actions - FIXE EN BAS */}
            <View style={styles.modalActionsFixed}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  { opacity: (!selectedMember || !selectedType || !justification.trim() || !fondsOk) ? 0.5 : 1 }
                ]}
                onPress={handleCreateAssistance}
                disabled={!selectedMember || !selectedType || !justification.trim() || !fondsOk || createAssistance.isPending}
              >
                {createAssistance.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Créer l'assistance</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: SPACING.xl,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  headerContent: {
    alignItems: "center",
    paddingTop: SPACING.md,
  },
  headerIcon: {
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.9)",
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
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },

  // Center States
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: "white",
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  emptyActionButton: {
    backgroundColor: "#7209B7",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyActionText: {
    color: "white",
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: width - SPACING.lg * 2,
    maxHeight: "85%",
    overflow: "hidden",
    shadowColor: "#7209B7",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
  },
  modalBody: {
    padding: SPACING.lg,
  },

  // Selector Styles
  selectorContainer: {
    marginBottom: SPACING.lg,
  },
  selectorLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  selectorLoading: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  scrollableSelector: {
    maxHeight: 250,
  },
  simpleSelectorContainer: {
    gap: SPACING.sm,
  },
  selectorItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorItemContent: {
    flex: 1,
  },
  selectorItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  selectorItemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  selectorItemSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  memberStatusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  memberStatusText: {
    fontSize: FONT_SIZES.xs,
    color: "white",
    fontWeight: "600",
  },
  typeAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
  },
  emptySelector: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  emptySelectorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Modal Results Counter
  modalResultsCounter: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.primary + "10",
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  modalResultsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Modal Load More Button
  modalLoadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  modalLoadMoreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Input Section
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  // Fund Status
  fundStatus: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  fundLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  fundValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.text,
  },
  fundWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.error + "10",
    borderRadius: BORDER_RADIUS.sm,
  },
  fundWarningText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmButton: {
    backgroundColor: "#7209B7",
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },

  // ✅ NOUVEAUX STYLES POUR LE MODAL AMÉLIORÉ
  newModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  newModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  modalHeaderContent: {
    flex: 1,
  },
  newModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalHeaderSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  newModalBody: {
    flex: 1,
  },
  newModalBodyContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  formBottomSpacing: {
    height: 20,
  },
  modalActionsFixed: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});