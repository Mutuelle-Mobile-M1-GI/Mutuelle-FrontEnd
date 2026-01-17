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
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSavings, useCreateSaving } from "../../hooks/useSaving";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { SavingTransaction, SavingTransactionType } from "../../types/saving.types";
import { Member } from "../../types/member.types";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// 🎯 Types
interface MemberSavings {
  id: string;
  numero_membre: string;
  nom_complet: string;
  email: string;
  statut: string;
  total_epargne: number;
  total_depots: number;
  total_retraits: number;
  nombre_transactions: number;
  derniere_transaction?: string;
}

interface SavingsStats {
  total_membres: number;
  total_epargne_globale: number;
  total_depots: number;
  total_retraits: number;
  moyenne_par_membre: number;
  transactions_ce_mois: number;
}

interface TabConfig {
  key: 'members'| 'overview'  | 'transactions';
  title: string;
  icon: string;
}

// 🎯 Configuration des onglets
const TABS: TabConfig[] = [
  { key: 'members', title: 'Membres', icon: 'people' },
  { key: 'overview', title: 'Vue d\'ensemble', icon: 'stats-chart' },
  { key: 'transactions', title: 'Transactions', icon: 'list' },
];

// 🎯 Formatage monétaire sécurisé
const formatCurrency = (amount: number | undefined | null): string => {
  if (!amount || isNaN(amount)) return "0 FCFA";
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
    disabled={!onPress}
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

// 🎯 Composant MemberSavingsCard
interface MemberSavingsCardProps {
  member: MemberSavings;
  onPress: () => void;
  onAddSaving: () => void;
}

const MemberSavingsCard = ({ member, onPress, onAddSaving }: MemberSavingsCardProps) => {
  const getSavingsLevelColor = () => {
    if (member.total_epargne >= 100000) return COLORS.success;
    if (member.total_epargne >= 50000) return COLORS.warning;
    return COLORS.primary;
  };

  return (
    <TouchableOpacity
      style={[styles.memberCard, { borderLeftColor: getSavingsLevelColor() }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header avec avatar et actions */}
      <View style={styles.memberHeader}>
        <View style={[styles.memberAvatar, { backgroundColor: getSavingsLevelColor() }]}>
          <Text style={styles.memberAvatarText}>
            {member.nom_complet.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.nom_complet}</Text>
          <Text style={styles.memberNumber}>{member.numero_membre}</Text>
          <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.addSavingButton}
          onPress={(e) => {
            e.stopPropagation();
            onAddSaving();
          }}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Montants */}
      <View style={styles.savingsAmounts}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Épargne totale</Text>
          <Text style={[styles.amountValue, { color: getSavingsLevelColor() }]}>
            {formatCurrency(member.total_epargne)} 
          </Text>
        </View>
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Ionicons name="arrow-up" size={16} color={COLORS.success} />
            <Text style={styles.amountItemText}>
              {formatCurrency(member.total_depots)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Ionicons name="arrow-down" size={16} color={COLORS.error} />
            <Text style={styles.amountItemText}>
              {formatCurrency(member.total_retraits)}
            </Text>
          </View>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.memberStats}>
        <View style={styles.statItem}>
          <Ionicons name="swap-horizontal" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statItemText}>
            {member.nombre_transactions} transaction{member.nombre_transactions > 1 ? 's' : ''}
          </Text>
        </View>
        {member.derniere_transaction && (
          <View style={styles.statItem}>
            <Ionicons name="time" size={14} color={COLORS.textSecondary} />
            <Text style={styles.statItemText}>
              Dernière: {new Date(member.derniere_transaction).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// 🎯 Composant TransactionCard
interface TransactionCardProps {
  transaction: SavingTransaction;
}

const TransactionCard = ({ transaction }: TransactionCardProps) => {
  const getTransactionColor = () => {
    switch (transaction.type_transaction) {
      case 'DEPOT': return COLORS.success;
      case 'RETRAIT_PRET': return COLORS.error;
      case 'INTERET': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  const getTransactionIcon = () => {
    switch (transaction.type_transaction) {
      case 'DEPOT': return 'arrow-up-circle';
      case 'RETRAIT_PRET': return 'arrow-down-circle';
      case 'INTERET': return 'trending-up';
      default: return 'swap-horizontal';
    }
  };

  return (
    <View style={[styles.transactionCard, { borderLeftColor: getTransactionColor() }]}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionMember}>
          <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor()}20` }]}>
            <Ionicons name={getTransactionIcon() as any} size={20} color={getTransactionColor()} />
          </View>
          <View style={styles.transactionMemberInfo}>
            <Text style={styles.transactionMemberName}>
              {transaction.membre_info?.nom_complet || "Membre non défini"}
            </Text>
            <Text style={styles.transactionMemberNumber}>
              {transaction.membre_info?.numero_membre || "N/A"}
            </Text>
          </View>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.transactionAmountValue, { color: getTransactionColor() }]}>
            {transaction.type_transaction === 'RETRAIT_PRET' ? '-' : '+'}
            {formatCurrency(transaction.montant)}
          </Text>
          <Text style={styles.transactionType}>
            {transaction.type_transaction_display}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.transactionDetailItem}>
          <Ionicons name="calendar" size={14} color={COLORS.textSecondary} />
          <Text style={styles.transactionDetailText}>
            {new Date(transaction.date_transaction).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <View style={styles.transactionDetailItem}>
          <Ionicons name="business" size={14} color={COLORS.textSecondary} />
          <Text style={styles.transactionDetailText}>
            {transaction.session_nom || "Session N/A"}
          </Text>
        </View>
      </View>

      {transaction.notes && (
        <View style={styles.transactionNotes}>
          <Text style={styles.transactionNotesText} numberOfLines={2}>
            {transaction.notes}
          </Text>
        </View>
      )}
    </View>
  );
};

// 🎯 Composant principal
export default function SavingsScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'transactions'>('overview');
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberSavings | null>(null);
  const [savingAmount, setSavingAmount] = useState("");
  const [savingNotes, setSavingNotes] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | SavingTransactionType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  // Navigation
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<MemberSavings | null>(null);

  // Hooks de données
  const { data: savingsData, isLoading: loadingSavings, isError: errorSavings, refetch: refetchSavings } = useSavings();
  const { data: membersData, isLoading: loadingMembers, isError: errorMembers } = useMembers();
  const { data: currentSession, isLoading: loadingSession, isError: errorSession } = useCurrentSession();
  const createSaving = useCreateSaving();

  // 🔧 Protection et normalisation des données
  const savings: SavingTransaction[] = useMemo(() => {
    if (Array.isArray(savingsData)) {
      return savingsData;
    }
    if (savingsData && Array.isArray(savingsData.results)) {
      return savingsData.results;
    }
    return [];
  }, [savingsData]);

  const members: Member[] = useMemo(() => {
    if (Array.isArray(membersData)) {
      return membersData;
    }
    if (membersData && Array.isArray(membersData.results)) {
      return membersData.results;
    }
    return [];
  }, [membersData]);

  // Calcul des épargnes par membre
  const memberSavings: MemberSavings[] = useMemo(() => {
    const savingsMap: Record<string, {
      depots: number;
      retraits: number;
      transactions: SavingTransaction[];
    }> = {};

    // Regrouper les transactions par membre
    savings.forEach(transaction => {
      if (!savingsMap[transaction.membre]) {
        savingsMap[transaction.membre] = {
          depots: 0,
          retraits: 0,
          transactions: []
        };
      }
      
      savingsMap[transaction.membre].transactions.push(transaction);
      
      if (transaction.type_transaction === 'DEPOT' || transaction.type_transaction === 'INTERET') {
        savingsMap[transaction.membre].depots += transaction.montant || 0;
      } else if (transaction.type_transaction === 'RETRAIT_PRET') {
        savingsMap[transaction.membre].retraits += transaction.montant || 0;
      }
    });

    // Créer la liste des membres avec leurs épargnes
    return members.map(member => {
      const memberData = savingsMap[member.id] || { depots: 0, retraits: 0, transactions: [] };
      const totalEpargne = memberData.depots - memberData.retraits;
      
      // Trouver la dernière transaction
      const derniereTransaction = memberData.transactions
        .sort((a, b) => new Date(b.date_transaction).getTime() - new Date(a.date_transaction).getTime())[0];

      return {
        id: member.id,
        numero_membre: member.numero_membre,
        nom_complet: member.utilisateur?.nom_complet || "Nom non disponible",
        email: member.utilisateur?.email || "",
        statut: member.statut,
        total_epargne: member.donnees_financieres.epargne.epargne_totale || 0,
        total_depots: memberData.depots,
        total_retraits: member.donnees_financieres.emprunt.montant_restant_a_rembourser,
        nombre_transactions: memberData.transactions.length,
        derniere_transaction: derniereTransaction?.date_transaction,
      };
    }).sort((a, b) => b.total_epargne - a.total_epargne); // Trier par épargne décroissante
  }, [members, savings]);

  // Filtrage des membres
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return memberSavings;
    
    return memberSavings.filter(member =>
      [member.nom_complet, member.numero_membre, member.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [memberSavings, search]);

  // Filtrage des transactions
  const filteredTransactions = useMemo(() => {
    let filtered = savings;

    // Filtre par type
    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.type_transaction === transactionTypeFilter);
    }

    // Filtre par recherche
    if (search.trim()) {
      filtered = filtered.filter(transaction =>
        [
          transaction.membre_info?.nom_complet,
          transaction.membre_info?.numero_membre,
          transaction.type_transaction_display,
          transaction.notes,
        ].filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.date_transaction).getTime() - new Date(a.date_transaction).getTime()
    );
  }, [savings, transactionTypeFilter, search]);

  // Statistiques globales
  const stats: SavingsStats = useMemo(() => {
    const totalDepots = memberSavings.reduce((sum, m) => sum + m.total_epargne, 0);
    const totalRetraits = memberSavings.reduce((sum, m) => sum + m.total_retraits, 0);
    const totalEpargneGlobale = totalDepots;
    const moyenneParMembre = memberSavings.length > 0 ? totalEpargneGlobale / memberSavings.length : 0;
    
    // Transactions de ce mois
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    
    const transactionsCeMois = savings.filter(t => 
      new Date(t.date_transaction) >= debutMois
    ).length;

    return {
      total_membres: memberSavings.length,
      total_epargne_globale: totalEpargneGlobale,
      total_depots: totalDepots,
      total_retraits: totalRetraits,
      moyenne_par_membre: moyenneParMembre,
      transactions_ce_mois: transactionsCeMois,
    };
  }, [memberSavings, savings]);

  // Actions
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchSavings();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    }
    setRefreshing(false);
  };

  const handleMemberPress = (member: MemberSavings) => {
    setSelectedMemberDetail(member);
    setShowMemberDetail(true);
  };

  const handleAddSaving = (member: MemberSavings) => {
    setSelectedMember(member);
    setSavingAmount("");
    setSavingNotes("");
    setShowAddModal(true);
  };

  const handleCreateSaving = () => {
    if (!selectedMember) {
      Alert.alert("Erreur", "Aucun membre sélectionné.");
      return;
    }

    if (!savingAmount.trim() || isNaN(Number(savingAmount)) || Number(savingAmount) <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un montant valide.");
      return;
    }

    if (!currentSession?.id) {
      Alert.alert("Erreur", "Aucune session courante disponible.");
      return;
    }

    createSaving.mutate(
      {
        membre: selectedMember.id,
        session: currentSession.id,
        montant: Number(savingAmount),
        type_transaction: "DEPOT",
        notes: savingNotes.trim(),
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setSelectedMember(null);
          setSavingAmount("");
          setSavingNotes("");
          Alert.alert("Succès", "Dépôt d'épargne enregistré avec succès !");
        },
        onError: (error: any) => {
          console.error("Erreur création épargne:", error);
          Alert.alert(
            "Erreur",
            error?.response?.data?.details || 
            error?.response?.data?.error || 
            "Impossible d'enregistrer le dépôt."
          );
        },
      }
    );
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedMember(null);
    setSavingAmount("");
    setSavingNotes("");
  };

  // État de chargement global
  const isLoading = loadingSavings || loadingMembers || loadingSession;
  const hasError = errorSavings || errorMembers || errorSession;

  // 🔧 Render du contenu selon l'onglet actif
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>
            Impossible de charger les données d'épargne.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            {/* Section statistiques */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques globales</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Épargne totale"
                  value={formatCurrency(stats.total_epargne_globale)}
                  icon="wallet"
                  color="#B5179E"
                  subtitle={`${stats.total_membres} membres`}
                />
              
                <StatCard
                  title="Moyenne/membre"
                  value={formatCurrency(stats.moyenne_par_membre)}
                  icon="trending-up"
                  color={COLORS.primary}
                  subtitle="Épargne moyenne"
                />
                <StatCard
                  title="Transactions"
                  value={stats.transactions_ce_mois.toString()}
                  icon="swap-horizontal"
                  color={COLORS.warning}
                  subtitle="Ce mois-ci"
                />
              </View>
            </View>

            {/* Top épargnants */}
            <View style={styles.topSaversSection}>
              <Text style={styles.sectionTitle}>Top épargnants</Text>
              {memberSavings.slice(0, 5).map((member, index) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.topSaverCard}
                  onPress={() => handleMemberPress(member)}
                >
                  <View style={styles.topSaverRank}>
                    <Text style={styles.topSaverRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topSaverInfo}>
                    <Text style={styles.topSaverName}>{member.nom_complet}</Text>
                    <Text style={styles.topSaverAmount}>
                      {formatCurrency(member.total_epargne)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'members':
        return (
          <View style={styles.tabContent}>
            {/* Section recherche */}
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
            </View>

            {/* Liste des membres */}
            {filteredMembers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucun membre trouvé</Text>
                <Text style={styles.emptyText}>
                  {search ? "Aucun résultat pour votre recherche." : "Aucun membre disponible."}
                </Text>
              </View>
            ) : (
              <View style={styles.membersListContainer}>
                <Text style={styles.sectionTitle}>
                  Membres avec épargne ({filteredMembers.length})
                </Text>
                {filteredMembers.map((member) => (
                  <View key={member.id} style={{ marginBottom: SPACING.md }}>
                    <MemberSavingsCard
                      member={member}
                      onPress={() => handleMemberPress(member)}
                      onAddSaving={() => handleAddSaving(member)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'transactions':
        return (
          <View style={styles.tabContent}>
            {/* Section recherche et filtres */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher une transaction..."
                  placeholderTextColor={COLORS.textLight}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtres de type */}
              <View style={styles.filtersContainer}>
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'DEPOT', label: 'Dépôts' },
                  { key: 'RETRAIT_PRET', label: 'Retraits' },
                  { key: 'INTERET', label: 'Intérêts' },
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      { backgroundColor: transactionTypeFilter === filter.key ? "#B5179E" : COLORS.surface }
                    ]}
                    onPress={() => setTransactionTypeFilter(filter.key as any)}
                  >
                    <Text style={[
                      styles.filterText,
                      { color: transactionTypeFilter === filter.key ? 'white' : COLORS.text }
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Liste des transactions */}
            {filteredTransactions.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="swap-horizontal-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucune transaction trouvée</Text>
                <Text style={styles.emptyText}>
                  {search ? "Aucun résultat pour votre recherche." : "Aucune transaction d'épargne enregistrée."}
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsListContainer}>
                <Text style={styles.sectionTitle}>
                  Transactions ({filteredTransactions.length})
                </Text>
                {filteredTransactions.map((transaction) => (
                  <View key={transaction.id} style={{ marginBottom: SPACING.md }}>
                    <TransactionCard transaction={transaction} />
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec gradient et bouton retour */}
      <LinearGradient
        colors={["#B5179E", "#F72585"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {navigation.goBack()}}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="wallet" size={28} color="white" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Gestion des Épargnes</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={styles.headerSubtitle}>
            Session: {currentSession?.nom || "Chargement..."}
          </Text>
        </View>
      </LinearGradient>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.key ? "#B5179E" : 'transparent' }
            ]}
            onPress={() => {
              setActiveTab(tab.key);
              setSearch(""); // Reset search when changing tabs
            }}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.key ? 'white' : COLORS.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? 'white' : COLORS.textSecondary }
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu des onglets */}
      <FlatList
        data={[{ type: 'content' }]}
        keyExtractor={() => 'tab-content'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={() => renderTabContent()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {/* Modal d'ajout d'épargne */}
      <Modal 
        visible={showAddModal} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={["#B5179E", "#A855F7"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nouveau Dépôt d'Épargne</Text>
              <TouchableOpacity onPress={closeAddModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {/* Informations membre */}
              <View style={styles.memberInfoSection}>
                <View style={styles.memberModalAvatar}>
                  <Text style={styles.memberModalAvatarText}>
                    {selectedMember?.nom_complet.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberModalInfo}>
                  <Text style={styles.memberModalName}>{selectedMember?.nom_complet}</Text>
                  <Text style={styles.memberModalNumber}>{selectedMember?.numero_membre}</Text>
                  <Text style={styles.memberModalEpargne}>
                    Épargne actuelle: {formatCurrency(selectedMember?.total_epargne)}
                  </Text>
                </View>
              </View>

              {/* Formulaire */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>
                  Montant du dépôt <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={savingAmount}
                  onChangeText={setSavingAmount}
                  placeholder="Montant en FCFA"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />

                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={savingNotes}
                  onChangeText={setSavingNotes}
                  placeholder="Notes sur ce dépôt..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeAddModal}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.confirmButton,
                    { 
                      opacity: (!savingAmount.trim() || createSaving.isPending) ? 0.5 : 1 
                    }
                  ]}
                  onPress={handleCreateSaving}
                  disabled={!savingAmount.trim() || createSaving.isPending}
                >
                  {createSaving.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal détail membre */}
      <Modal 
        visible={showMemberDetail} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={["#B5179E", "#A855F7"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Détail Épargne</Text>
              <TouchableOpacity onPress={() => setShowMemberDetail(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {selectedMemberDetail && (
                <>
                  {/* Informations membre */}
                  <View style={{height:15}}></View>
                  <View style={styles.memberDetailSection}>
                    <View style={styles.memberModalAvatar}>
                      <Text style={styles.memberModalAvatarText}>
                        {selectedMemberDetail.nom_complet.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberModalInfo}>
                      <Text style={styles.memberModalName}>{selectedMemberDetail.nom_complet}</Text>
                      <Text style={styles.memberModalNumber}>{selectedMemberDetail.numero_membre}</Text>
                    </View>
                  </View>

                  {/* Résumé épargne */}
                  <View style={styles.savingsResume}>
                    <View style={styles.resumeItem}>
                      <Text style={styles.resumeLabel}>Épargne totale</Text>
                      <Text style={[styles.resumeValue, { color: "#B5179E" }]}>
                        {formatCurrency(selectedMemberDetail.total_epargne)}
                      </Text>
                    </View>
                    
                 
                    <View style={styles.resumeItem}>
                      <Text style={styles.resumeLabel}>Transactions</Text>
                      <Text style={styles.resumeValue}>
                        {selectedMemberDetail.nombre_transactions}
                      </Text>
                    </View>
                  </View>

                  {/* Action */}
                  <TouchableOpacity
                    style={styles.addSavingModalButton}
                    onPress={() => {
                      setShowMemberDetail(false);
                      handleAddSaving(selectedMemberDetail);
                    }}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addSavingModalButtonText}>Ajouter un dépôt</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    alignItems: "center",
    marginTop:35,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  headerIcon: {
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Tab Content
  tabContent: {
    flex: 1,
  },

  // Sections
  statsSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  membersListContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  transactionsListContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  topSaversSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  // Stats
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
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  },
  statSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },

  // Filters
  filtersContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Member Card
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  memberAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  memberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  memberEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  addSavingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#B5179E",
    alignItems: "center",
    justifyContent: "center",
  },

  // Savings Amounts
  savingsAmounts: {
    marginBottom: SPACING.md,
  },
  amountSection: {
    marginBottom: SPACING.sm,
  },
  amountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  amountValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  amountItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Member Stats
  memberStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  statItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Transaction Card
  transactionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  transactionMember: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  transactionMemberInfo: {
    flex: 1,
  },
  transactionMemberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  transactionMemberNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    alignItems: "flex-end",
  },
  transactionAmountValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    marginBottom: SPACING.xs,
  },
  transactionType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  transactionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  transactionDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  transactionDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  transactionNotes: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  transactionNotesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },

  // Top Savers
  topSaverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topSaverRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#B5179E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  topSaverRankText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  topSaverInfo: {
    flex: 1,
  },
  topSaverName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  topSaverAmount: {
    fontSize: FONT_SIZES.md,
    color: "#B5179E",
    fontWeight: "600",
  },

  // Center Container
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    flex: 1,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.error,
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
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: "white",
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
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
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
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    marginTop:SPACING.lg,
  },

  // Member Info in Modal
  memberInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  memberDetailSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    marginTop:SPACING.lg,
  },
  memberModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#B5179E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  memberModalAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  memberModalInfo: {
    flex: 1,
  },
  memberModalName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  memberModalNumber: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  memberModalEpargne: {
    fontSize: FONT_SIZES.sm,
    color: "#B5179E",
    fontWeight: "600",
    marginTop: SPACING.xs,
  },

  // Savings Resume
  savingsResume: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resumeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  resumeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  resumeValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },

  // Form
  formSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: "#B5179E",
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },

  // Add Saving Modal Button
  addSavingModalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B5179E",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  addSavingModalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
});