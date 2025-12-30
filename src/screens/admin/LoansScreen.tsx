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
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useLoans, useCreateLoan, useCreateRepayment } from "../../hooks/useLoan";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { Loan, Repayment, LoanStatus } from "../../types/loan.types";
import { Member } from "../../types/member.types";
import { useNavigation } from "@react-navigation/native";
import { useAdminDashboard } from "../../hooks/useDashboard";
import { min } from "lodash";
// Feedback visuel et haptique
import { Vibration } from 'react-native';

const { width } = Dimensions.get("window");

// 🎨 Thème jaune
const YELLOW_THEME = {
  primary: "#F59E0B",
  primaryLight: "#FCD34D",
  primaryDark: "#D97706",
  background: "#FFFBEB",
  surface: "#FEF3C7",
  surfaceLight: "#FEF7DD",
  text: "#92400E",
  textDark: "#78350F",
  border: "#FDE68A",
  shadow: "rgba(245, 158, 11, 0.1)",
};

// 🎯 Types
interface LoanWithStats {
  id: string;
  membre_numero: string;
  membre_nom: string;
  membre_email: string;
  montant_emprunte: number;
  montant_total_a_rembourser: number;
  montant_rembourse: number;
  montant_restant: number;
  pourcentage_rembourse: number;
  taux_interet: number;
  statut: LoanStatus;
  statut_display: string;
  session_nom: string;
  date_emprunt: string;
  notes: string;
  remboursements: Repayment[];
  is_overdue: boolean;
  days_since_loan: number;
}

interface LoansStats {
  total_loans: number;
  active_loans: number;
  completed_loans: number;
  overdue_loans: number;
  total_amount_lent: number;
  total_amount_repaid: number;
  total_amount_outstanding: number;
  average_repayment_rate: number;
}

interface TabConfig {
  key: 'overview' | 'active' | 'completed' | 'overdue' | 'repayments';
  title: string;
  icon: string;
  color: string;
}

// 🎯 Configuration des onglets
const TABS: TabConfig[] = [
  { key: 'active', title: 'En cours', icon: 'hourglass', color: YELLOW_THEME.primaryLight },
  { key: 'overview', title: 'Stats', icon: 'stats-chart', color: YELLOW_THEME.primary },
  
  { key: 'completed', title: 'Finis', icon: 'checkmark-circle', color: COLORS.success },
  { key: 'overdue', title: 'Retard', icon: 'alert-circle', color: COLORS.error },
  { key: 'repayments', title: 'Remb', icon: 'cash', color: YELLOW_THEME.primaryDark },
];

// 🎯 Formatage monétaire sécurisé
const formatCurrency = (amount: number | undefined | null): string => {
  if (!amount|| isNaN(amount)) return "0 FCFA";
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
};

// 🎯 Formatage des dates
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('fr-FR');
  } catch {
    return "Date invalide";
  }
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

// 🎯 Composant LoanCard
interface LoanCardProps {
  loan: LoanWithStats;
  onPress: () => void;
  onAddRepayment: () => void;
}

const LoanCard = ({ loan, onPress, onAddRepayment }: LoanCardProps) => {
  const getStatusColor = () => {
    switch (loan.statut) {
      case 'REMBOURSE': return COLORS.success;
      case 'EN_RETARD': return COLORS.error;
      case 'EN_COURS': return loan.is_overdue ? COLORS.warning : YELLOW_THEME.primary;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (loan.statut) {
      case 'REMBOURSE': return 'checkmark-circle';
      case 'EN_RETARD': return 'alert-circle';
      case 'EN_COURS': return 'hourglass';
      default: return 'help-circle';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.loanCard, { borderLeftColor: getStatusColor() }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header avec membre et statut */}
      <View style={styles.loanHeader}>
        <View style={styles.loanMemberInfo}>
          <View style={[styles.loanAvatar, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.loanAvatarText}>
              {loan.membre_nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.loanDetails}>
            <Text style={styles.loanMemberName}>{loan.membre_nom}</Text>
            <Text style={styles.loanMemberNumber}>{loan.membre_numero}</Text>
            <Text style={styles.loanSession}>{loan.session_nom}</Text>
          </View>
        </View>
        <View style={styles.loanStatusContainer}>
          <View style={[styles.loanStatusBadge, { backgroundColor: getStatusColor() }]}>
            <Ionicons name={getStatusIcon() as any} size={16} color="white" />
          </View>
          <Text style={[styles.loanStatusText, { color: getStatusColor() }]}>
            {loan.statut_display}
          </Text>
        </View>
      </View>

      {/* Montants */}
      <View style={styles.loanAmounts}>
        <View style={styles.loanAmountRow}>
          <Text style={styles.loanAmountLabel}>Emprunté:</Text>
          <Text style={styles.loanAmountValue}>{formatCurrency(loan.montant_emprunte)}</Text>
        </View>
        <View style={styles.loanAmountRow}>
          <Text style={styles.loanAmountLabel}>À rembourser:</Text>
          <Text style={[styles.loanAmountValue, { color: YELLOW_THEME.primaryDark }]}>
            {formatCurrency(loan.montant_total_a_rembourser)}
          </Text>
        </View>
        <View style={styles.loanAmountRow}>
          <Text style={styles.loanAmountLabel}>Remboursé:</Text>
          <Text style={[styles.loanAmountValue, { color: COLORS.success }]}>
            {formatCurrency(loan.montant_rembourse)}
          </Text>
        </View>
        <View style={styles.loanAmountRow}>
          <Text style={styles.loanAmountLabel}>Restant:</Text>
          <Text style={[styles.loanAmountValue, { color: COLORS.error }]}>
            {formatCurrency(loan.montant_restant)}
          </Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progression du remboursement</Text>
          <Text style={[styles.progressPercentage, { color: getStatusColor() }]}>
            {Math.round(loan.pourcentage_rembourse)}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${Math.min(loan.pourcentage_rembourse, 100)}%`,
                backgroundColor: getStatusColor()
              }
            ]} 
          />
        </View>
      </View>

      {/* Informations additionnelles */}
      <View style={styles.loanFooter}>
        <View style={styles.loanInfoItem}>
          <Ionicons name="calendar" size={14} color={COLORS.textSecondary} />
          <Text style={styles.loanInfoText}>
            {formatDate(loan.date_emprunt)}
          </Text>
        </View>
        <View style={styles.loanInfoItem}>
          <Ionicons name="trending-up" size={14} color={COLORS.textSecondary} />
          <Text style={styles.loanInfoText}>
            {loan.taux_interet}% d'intérêt
          </Text>
        </View>
        {loan.statut !== 'REMBOURSE' && (
          <TouchableOpacity
            style={styles.addRepaymentButton}
            onPress={(e) => {
              e.stopPropagation();
              onAddRepayment();
            }}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addRepaymentButtonText}>Rembourser</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// 🎯 Composant RepaymentCard
interface RepaymentCardProps {
  repayment: Repayment;
}

const RepaymentCard = ({ repayment }: RepaymentCardProps) => (
  <View style={styles.repaymentCard}>
    <View style={styles.repaymentHeader}>
      <View style={styles.repaymentMemberInfo}>
        <View style={styles.repaymentIcon}>
          <Ionicons name="cash" size={20} color={YELLOW_THEME.primary} />
        </View>
        <View style={styles.repaymentDetails}>
          <Text style={styles.repaymentMemberName}>
            {repayment.emprunt_info?.membre_nom || "Membre non défini"}
          </Text>
          <Text style={styles.repaymentMemberNumber}>
            {repayment.emprunt_info?.membre_numero || "N/A"}
          </Text>
        </View>
      </View>
      <View style={styles.repaymentAmount}>
        <Text style={styles.repaymentAmountValue}>
          {formatCurrency(repayment.montant)}
        </Text>
        <Text style={styles.repaymentDate}>
          {formatDate(repayment.date_remboursement)}
        </Text>
      </View>
    </View>

    <View style={styles.repaymentBreakdown}>
      <View style={styles.repaymentBreakdownItem}>
        <Text style={styles.repaymentBreakdownLabel}>Capital:</Text>
        <Text style={styles.repaymentBreakdownValue}>
          {formatCurrency(repayment.montant_capital)}
        </Text>
      </View>
      <View style={styles.repaymentBreakdownItem}>
        <Text style={styles.repaymentBreakdownLabel}>Intérêts:</Text>
        <Text style={styles.repaymentBreakdownValue}>
          {formatCurrency(repayment.montant_interet)}
        </Text>
      </View>
    </View>

    <View style={styles.repaymentFooter}>
      <View style={styles.repaymentSessionInfo}>
        <Ionicons name="business" size={14} color={COLORS.textSecondary} />
        <Text style={styles.repaymentSessionText}>
          {repayment.session_nom || "Session N/A"}
        </Text>
      </View>
      {repayment.notes && (
        <Text style={styles.repaymentNotes} numberOfLines={2}>
          {repayment.notes}
        </Text>
      )}
    </View>
  </View>
);

// 🎯 Composant principal
export default function LoansScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'active' | 'completed' | 'overdue' | 'repayments'>('active');
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showLoanDetailModal, setShowLoanDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithStats | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentNotes, setRepaymentNotes] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigation= useNavigation();

  // Navigation
  const handleGoBack = () => {
    navigation.goBack();
    console.log("Go back");
  };

  // Hooks de données
  const { data: loansData, isLoading: loadingLoans, isError: errorLoans, refetch: refetchLoans } = useLoans();
  const { data: membersData, isLoading: loadingMembers, isError: errorMembers } = useMembers({statut:'EN_REGLE'});
  const { data: currentSession, isLoading: loadingSession, isError: errorSession } = useCurrentSession();
  const { data: dashboardData } = useAdminDashboard();

  const createLoan = useCreateLoan();
  const createRepayment = useCreateRepayment();
  

  // 🔧 Protection et normalisation des données
  const loans: Loan[] = useMemo(() => {
    if (Array.isArray(loansData)) {
      return loansData;
    }
    if (loansData && Array.isArray(loansData.results)) {
      return loansData.results;
    }
    return [];
  }, [loansData]);

  const members: Member[] = useMemo(() => {
    if (Array.isArray(membersData)) {
      return membersData;
    }
    if (membersData && Array.isArray(membersData.results)) {
      return membersData.results;
    }
    return [];
  }, [membersData]);
  // Ajoute cette interface ou étend Member existant
    interface MemberWithFinancials  {
      donnees_financieres?: {
        epargne: {
          epargne_totale: number;
        };
        emprunt: {
          montant_max_empruntable: number;
          a_emprunt_en_cours: boolean;
          montant_emprunt_en_cours: number;
        };
      };
    }

  // Transformation des données
  const loansWithStats: LoanWithStats[] = useMemo(() => {
    return loans.map(loan => {
      const daysAgo = Math.floor((Date.now() - new Date(loan.date_emprunt).getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = loan.statut === 'EN_COURS' && daysAgo > 90; // Considéré en retard après 90 jours

      return {
        id: loan.id,
        membre_numero: loan.membre_info?.numero_membre || "N/A",
        membre_nom: loan.membre_info?.nom_complet || "Nom non disponible",
        membre_email: loan.membre_info?.email || "",
        montant_emprunte: loan.montant_emprunte,
        montant_total_a_rembourser: loan.montant_total_a_rembourser,
        montant_rembourse: loan.montant_rembourse,
        montant_restant: loan.montant_restant_a_rembourser,
        pourcentage_rembourse: loan.pourcentage_rembourse || 0,
        taux_interet: loan.taux_interet,
        statut: loan.statut,
        statut_display: loan.statut_display,
        session_nom: loan.session_nom,
        date_emprunt: loan.date_emprunt,
        notes: loan.notes || "",
        remboursements: loan.remboursements_details || [],
        is_overdue: isOverdue,
        days_since_loan: daysAgo,
      };
    }).sort((a, b) => new Date(b.date_emprunt).getTime() - new Date(a.date_emprunt).getTime());
  }, [loans]);

  // Filtrage des prêts selon l'onglet actif
  const filteredLoans = useMemo(() => {
    let filtered = loansWithStats;

    // Filtre par onglet
    switch (activeTab) {
      case 'active':
        filtered = filtered.filter(loan => loan.statut === 'EN_COURS' && !loan.is_overdue);
        break;
      case 'completed':
        filtered = filtered.filter(loan => loan.statut === 'REMBOURSE');
        break;
      case 'overdue':
        filtered = filtered.filter(loan => loan.statut === 'EN_RETARD' || loan.is_overdue);
        break;
      default:
        break;
    }

    // Filtre par recherche
    if (search.trim()) {
      filtered = filtered.filter(loan =>
        [loan.membre_nom, loan.membre_numero, loan.session_nom, loan.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [loansWithStats, activeTab, search]);

  // Tous les remboursements
  const allRepayments: Repayment[] = useMemo(() => {
    return loansWithStats
      .flatMap(loan => loan.remboursements)
      .sort((a, b) => new Date(b.date_remboursement).getTime() - new Date(a.date_remboursement).getTime());
  }, [loansWithStats]);

  // Filtrage des remboursements par recherche
  const filteredRepayments = useMemo(() => {
    if (!search.trim()) return allRepayments;

    return allRepayments.filter(repayment =>
      [
        repayment.emprunt_info?.membre_nom,
        repayment.emprunt_info?.membre_numero,
        repayment.session_nom,
        repayment.notes,
      ].filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    );
  }, [allRepayments, search]);

  // Statistiques globales
  const stats: LoansStats = useMemo(() => {
    const totalLoans = loansWithStats.length;
    const activeLoans = loansWithStats.filter(loan => loan.statut === 'EN_COURS').length;
    const completedLoans = loansWithStats.filter(loan => loan.statut === 'REMBOURSE').length;
    const overdueLoans = loansWithStats.filter(loan => loan.statut === 'EN_RETARD' || loan.is_overdue).length;
    
    const totalAmountLent = loansWithStats.reduce((sum, loan) => sum + loan.montant_emprunte, 0);
    const totalAmountRepaid = loansWithStats.reduce((sum, loan) => sum + loan.montant_rembourse, 0);
    const totalAmountOutstanding = loansWithStats.reduce((sum, loan) => sum + loan.montant_restant, 0);
    
    const averageRepaymentRate = totalLoans > 0 
      ? loansWithStats.reduce((sum, loan) => sum + loan.pourcentage_rembourse, 0) / totalLoans 
      : 0;

    return {
      total_loans: totalLoans,
      active_loans: activeLoans,
      completed_loans: completedLoans,
      overdue_loans: overdueLoans,
      total_amount_lent: totalAmountLent,
      total_amount_repaid: totalAmountRepaid,
      total_amount_outstanding: totalAmountOutstanding,
      average_repayment_rate: averageRepaymentRate,
    };
  }, [loansWithStats]);

  // Filtrage des membres
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    
    return members.filter(member =>
      [member.utilisateur?.nom_complet, member.numero_membre, member.utilisateur?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [members, search]);

  // Actions
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchLoans();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    }
    setRefreshing(false);
  };

  const handleLoanPress = (loan: LoanWithStats) => {
    setSelectedLoan(loan);
    setShowLoanDetailModal(true);
  };

  const handleAddRepayment = (loan: LoanWithStats) => {
    setSelectedLoan(loan);
    setRepaymentAmount(loan.montant_restant > 0 ? loan.montant_restant.toString() : "");
    setRepaymentNotes("");
    setShowRepaymentModal(true);
  };

  const handleCreateLoan = () => {
    if (!selectedMember) {
      Alert.alert("Erreur", "Aucun membre sélectionné.");
      return;
    }
  
    if (!loanAmount.trim() || isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un montant valide.");
      return;
    }
  
    const montant = Number(loanAmount);
    const maxEmpruntable = selectedMember.donnees_financieres?.emprunt?.montant_max_empruntable || 0;
    const liquiditesDisponibles = dashboardData?.tresor?.cumul_total_epargnes || 0;
  
    // Vérifications de sécurité
    if (montant > maxEmpruntable) {
      Alert.alert(
        "Montant trop élevé",
        `Le montant demandé (${formatCurrency(montant)}) dépasse le maximum empruntable pour ce membre (${formatCurrency(maxEmpruntable)}).`
      );
      return;
    }
  
    if (montant > liquiditesDisponibles) {
      Alert.alert(
        "Liquidités insuffisantes",
        `Le montant demandé (${formatCurrency(montant)}) dépasse les liquidités disponibles (${formatCurrency(liquiditesDisponibles)}).`
      );
      return;
    }
  
    if (!currentSession?.id) {
      Alert.alert("Erreur", "Aucune session courante disponible.");
      return;
    }
  
    // Confirmation si montant important
    if (montant > maxEmpruntable * 0.8) {
      Alert.alert(
        "Confirmation",
        `Vous vous apprêtez à accorder un emprunt de ${formatCurrency(montant)} à ${selectedMember.utilisateur?.nom_complet}. Continuer ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer", onPress: createLoanAction }
        ]
      );
    } else {
      createLoanAction();
    }
  };


  const createLoanAction = () => {
    createLoan.mutate(
      {
        membre: selectedMember?.id,
        session: currentSession.id,
        montant_emprunte: Number(loanAmount),
        notes: loanNotes.trim(),
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setSelectedMember(null);
          setLoanAmount("");
          setLoanNotes("");
          Alert.alert("Succès", "Emprunt créé avec succès !");
        },
        onError: (error: any) => {
          console.error("Erreur création emprunt:", error);
          Alert.alert(
            "Erreur",
            error?.response?.data?.details || 
            error?.response?.data?.error || 
            "Impossible de créer l'emprunt."
          );
        },
      }
    );
  };

  const handleCreateRepayment = () => {
    if (!selectedLoan) {
      Alert.alert("Erreur", "Aucun emprunt sélectionné.");
      return;
    }

    if (!repaymentAmount.trim() || isNaN(Number(repaymentAmount)) || Number(repaymentAmount) <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un montant valide.");
      return;
    }

    const montant = Number(repaymentAmount);
    if (montant > selectedLoan.montant_restant * 1.5) {
      Alert.alert(
        "Confirmation",
        `Le montant saisi (${formatCurrency(montant)}) est supérieur au montant restant (${formatCurrency(selectedLoan.montant_restant)}). Continuer ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Continuer", onPress: createRepaymentAction }
        ]
      );
    } else {
      createRepaymentAction();
    }
  };

  const createRepaymentAction = () => {
    if (!selectedLoan) return;

    createRepayment.mutate(
      {
        emprunt: selectedLoan.id,
        montant: Number(repaymentAmount),
        notes: repaymentNotes.trim(),
      },
      {
        onSuccess: () => {
          setShowRepaymentModal(false);
          setSelectedLoan(null);
          setRepaymentAmount("");
          setRepaymentNotes("");
          Alert.alert("Succès", "Remboursement enregistré avec succès !");
        },
        onError: (error: any) => {
          console.error("Erreur création remboursement:", error);
          Alert.alert(
            "Erreur",
            error?.response?.data?.details || 
            error?.response?.data?.error || 
            "Impossible d'enregistrer le remboursement."
          );
        },
      }
    );
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedMember(null);
    setLoanAmount("");
    setLoanNotes("");
  };

  const closeRepaymentModal = () => {
    setShowRepaymentModal(false);
    setSelectedLoan(null);
    setRepaymentAmount("");
    setRepaymentNotes("");
  };

  // État de chargement global
  const isLoading = loadingLoans || loadingMembers || loadingSession;
  const hasError = errorLoans || errorMembers || errorSession;

  // 🔧 Render du contenu selon l'onglet actif
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={YELLOW_THEME.primary} />
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
            Impossible de charger les données d'emprunts.
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
                  title="Total emprunts"
                  value={stats.total_loans.toString()}
                  icon="library"
                  color={YELLOW_THEME.primary}
                  subtitle="Depuis le début"
                />
                <StatCard
                  title="Emprunts actifs"
                  value={stats.active_loans.toString()}
                  icon="hourglass"
                  color={YELLOW_THEME.primaryLight}
                  subtitle="En cours de remb."
                />
                <StatCard
                  title="Remboursés"
                  value={stats.completed_loans.toString()}
                  icon="checkmark-circle"
                  color={COLORS.success}
                  subtitle="Complètement"
                />
                <StatCard
                  title="En retard"
                  value={stats.overdue_loans.toString()}
                  icon="alert-circle"
                  color={COLORS.error}
                  subtitle="À surveiller"
                />
                <StatCard
                  title="Montant prêté"
                  value={formatCurrency(stats.total_amount_lent)}
                  icon="cash"
                  color={YELLOW_THEME.primaryDark}
                  subtitle="Total des prêts"
                />
                <StatCard
                  title="Montant remboursé"
                  value={formatCurrency(stats.total_amount_repaid)}
                  icon="trending-up"
                  color={COLORS.success}
                  subtitle="Récupéré"
                />
                <StatCard
                  title="Montant en attente"
                  value={formatCurrency(stats.total_amount_outstanding)}
                  icon="time"
                  color={COLORS.warning}
                  subtitle="À récupérer"
                />
                <StatCard
                  title="Taux moyen"
                  value={`${Math.round(stats.average_repayment_rate)}%`}
                  icon="analytics"
                  color={YELLOW_THEME.primary}
                  subtitle="De remboursement"
                />
              </View>
            </View>

            {/* Emprunts récents */}
            <View style={styles.recentLoansSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Emprunts récents</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addButtonText}>Nouveau</Text>
                </TouchableOpacity>
              </View>
              {loansWithStats.slice(0, 5).map((loan) => (
                <View key={loan.id} style={{ marginBottom: SPACING.md }}>
                  <LoanCard
                    loan={loan}
                    onPress={() => handleLoanPress(loan)}
                    onAddRepayment={() => handleAddRepayment(loan)}
                  />
                </View>
              ))}
            </View>
          </View>
        );

      case 'repayments':
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
                  placeholder="Rechercher un remboursement..."
                  placeholderTextColor={COLORS.textLight}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Liste des remboursements */}
            {filteredRepayments.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="cash-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucun remboursement trouvé</Text>
                <Text style={styles.emptyText}>
                  {search ? "Aucun résultat pour votre recherche." : "Aucun remboursement enregistré."}
                </Text>
              </View>
            ) : (
              <View style={styles.repaymentsListContainer}>
                <Text style={styles.sectionTitle}>
                  Remboursements ({filteredRepayments.length})
                </Text>
                {filteredRepayments.map((repayment) => (
                  <View key={repayment.id} style={{ marginBottom: SPACING.md }}>
                    <RepaymentCard repayment={repayment} />
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
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
                  placeholder="Rechercher un emprunt..."
                  placeholderTextColor={COLORS.textLight}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Nouvel emprunt</Text>
              </TouchableOpacity>
            </View>

            {/* Liste des emprunts */}
            {filteredLoans.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="library-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucun emprunt trouvé</Text>
                <Text style={styles.emptyText}>
                  {search ? "Aucun résultat pour votre recherche." : "Aucun emprunt dans cette catégorie."}
                </Text>
              </View>
            ) : (
              <View style={styles.loansListContainer}>
                <Text style={styles.sectionTitle}>
                  {TABS.find(tab => tab.key === activeTab)?.title} ({filteredLoans.length})
                </Text>
                {filteredLoans.map((loan) => (
                  <View key={loan.id} style={{ marginBottom: SPACING.md }}>
                    <LoanCard
                      loan={loan}
                      onPress={() => handleLoanPress(loan)}
                      onAddRepayment={() => handleAddRepayment(loan)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={YELLOW_THEME.primary} />
      
      {/* Header avec gradient jaune et bouton retour */}
      <LinearGradient
        colors={[YELLOW_THEME.primary, YELLOW_THEME.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleGoBack}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="cash" size={28} color="white" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Gestion des Emprunts</Text>
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
              { backgroundColor: activeTab === tab.key ? tab.color : 'transparent' }
            ]}
            onPress={() => {
              setActiveTab(tab.key);
              setSearch(""); // Reset search when changing tabs
            }}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
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

      {/* Modal de création d'emprunt */}
      <Modal 
        visible={showCreateModal} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContainer}>
            <LinearGradient
              colors={[YELLOW_THEME.primary, YELLOW_THEME.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nouvel Emprunt</Text>
              <TouchableOpacity onPress={closeCreateModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              {/* Sélection membre */}
             {/* Sélection membre améliorée */}
              <ScrollView style={styles.memberSelectionSection}>
                <Text style={styles.inputLabel}>
                  Sélectionner un membre <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher un membre..."
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                
                  {filteredMembers.slice(0, 3).map((member) => {
                    const financials = member.donnees_financieres;
                    const epargneTotal = financials?.epargne?.epargne_totale || 0;
                    const maxEmpruntable = financials?.emprunt?.montant_max_empruntable || 0;
                    const aEmpruntEnCours = financials?.emprunt?.a_emprunt_en_cours || false;
                    const empruntEnCours = financials?.emprunt?.montant_emprunt_en_cours || 0;
                    const peutEmprunter = !aEmpruntEnCours && maxEmpruntable > 0;

                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.memberCardModal,
                          { 
                            backgroundColor: selectedMember?.id === member.id 
                              ? YELLOW_THEME.surfaceLight 
                              : COLORS.surface,
                            borderColor: selectedMember?.id === member.id 
                              ? YELLOW_THEME.primary 
                              : peutEmprunter ? COLORS.border : COLORS.error,
                            opacity: peutEmprunter ? 1 : 0.6
                          }
                        ]}
                        onPress={() => peutEmprunter && setSelectedMember(member)}
                        disabled={!peutEmprunter}
                      >
                        <View style={styles.memberModalInfo}>
                          <Text style={styles.memberModalName}>
                            {member.utilisateur?.nom_complet || "Nom non disponible"}
                          </Text>
                          <Text style={styles.memberModalNumber}>
                            {member.numero_membre}
                          </Text>
                          <Text style={styles.memberModalEmail}>
                            {member.utilisateur?.email || ""}
                          </Text>
                          
                          {/* Infos financières */}
                          <View style={styles.memberFinancialInfo}>
                            <View style={styles.financialInfoRow}>
                              <Ionicons name="wallet" size={14} color={YELLOW_THEME.primary} />
                              <Text style={styles.financialInfoText}>
                                Épargne: {formatCurrency(epargneTotal)}
                              </Text>
                            </View>
                            <View style={styles.financialInfoRow}>
                              <Ionicons 
                                name={peutEmprunter ? "checkmark-circle" : "close-circle"} 
                                size={14} 
                                color={peutEmprunter ? COLORS.success : COLORS.error} 
                              />
                              <Text style={[
                                styles.financialInfoText,
                                { color: peutEmprunter ? COLORS.success : COLORS.error }
                              ]}>
                                {aEmpruntEnCours 
                                  ? `Emprunt en cours: ${formatCurrency(empruntEnCours)}`
                                  : `Max empruntable: ${formatCurrency(min([maxEmpruntable,dashboardData?.tresor.cumul_total_epargnes]))}`
                                }
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {selectedMember?.id === member.id && peutEmprunter && (
                          <Ionicons name="checkmark-circle" size={24} color={YELLOW_THEME.primary} />
                        )}
                        {!peutEmprunter && (
                          <Ionicons name="lock-closed" size={24} color={COLORS.error} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {filteredMembers.length === 0 && (
                    <Text style={styles.noMembersText}>
                      {search ? "Aucun membre trouvé." : "Aucun membre disponible."}
                    </Text>
                  )}

                  <View style={{height:25}}></View>
                </ScrollView>

              

              {/* Formulaire */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>
                  Montant à emprunter <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
  style={[
    styles.input,
    {
      borderColor: (selectedMember && Number(loanAmount) > (selectedMember.donnees_financieres?.emprunt?.montant_max_empruntable || 0) || (selectedMember && Number(loanAmount) > (dashboardData?.tresor.cumul_total_epargnes || 0) ))
        ? COLORS.error
        : YELLOW_THEME.border
    }
  ]}
  value={loanAmount}
  onChangeText={(text) => {
    setLoanAmount(text);
    
    // Validation en temps réel
    const montant = Number(text);
    const maxEmpruntable = min([selectedMember?.donnees_financieres?.emprunt?.montant_max_empruntable,dashboardData?.tresor.cumul_total_epargnes]) || 0;
    
    
    if (montant > maxEmpruntable && selectedMember) {
      // Feedback visuel simple avec vibration native
      
      // Vibration courte d'erreur (pattern: vibrer 100ms, pause 50ms, vibrer 100ms)
      Vibration.vibrate([100, 50, 100]);
      
      // Log pour debug
      console.warn(`Montant dépassé: ${formatCurrency(montant)} > ${formatCurrency(maxEmpruntable)}`);
      
      // Optionnel: Feedback visuel temporaire (tu peux ajouter un state pour ça)
      // setShowErrorFeedback(true);
      // setTimeout(() => setShowErrorFeedback(false), 2000);
    }
  }}
  placeholder={`Montant max: ${selectedMember ? formatCurrency(min([selectedMember?.donnees_financieres?.emprunt?.montant_max_empruntable,dashboardData?.tresor.cumul_total_epargnes])|| 0) : 'Sélectionnez un membre'}`}
  keyboardType="numeric"
  placeholderTextColor={COLORS.textLight}
/>

                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={loanNotes}
                  onChangeText={setLoanNotes}
                  placeholder="Notes sur cet emprunt..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeCreateModal}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.confirmButton,
                    { 
                      opacity: (!loanAmount.trim() || !selectedMember || createLoan.isPending) ? 0.5 : 1 
                    }
                  ]}
                  onPress={handleCreateLoan}
                  disabled={!loanAmount.trim() || !selectedMember || createLoan.isPending}
                >
                  {createLoan.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Créer l'emprunt</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de remboursement */}
      <Modal 
        visible={showRepaymentModal} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContainer}>
            <LinearGradient
              colors={[YELLOW_THEME.primary, YELLOW_THEME.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nouveau Remboursement</Text>
              <TouchableOpacity onPress={closeRepaymentModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              {/* Informations emprunt */}
              {selectedLoan && (
                <View style={styles.loanInfoSection}>
                  <View style={styles.loanInfoHeader}>
                    <View style={styles.loanInfoAvatar}>
                      <Text style={styles.loanInfoAvatarText}>
                        {selectedLoan.membre_nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.loanInfoDetails}>
                      <Text style={styles.loanInfoMemberName}>{selectedLoan.membre_nom}</Text>
                      <Text style={styles.loanInfoMemberNumber}>{selectedLoan.membre_numero}</Text>
                    </View>
                  </View>

                  <View style={styles.loanInfoAmounts}>
                    <View style={styles.loanInfoAmountRow}>
                      <Text style={styles.loanInfoAmountLabel}>Montant emprunté:</Text>
                      <Text style={styles.loanInfoAmountValue}>
                        {formatCurrency(selectedLoan.montant_emprunte)}
                      </Text>
                    </View>
                    <View style={styles.loanInfoAmountRow}>
                      <Text style={styles.loanInfoAmountLabel}>Total à rembourser:</Text>
                      <Text style={styles.loanInfoAmountValue}>
                        {formatCurrency(selectedLoan.montant_total_a_rembourser)}
                      </Text>
                    </View>
                    <View style={styles.loanInfoAmountRow}>
                      <Text style={styles.loanInfoAmountLabel}>Déjà remboursé:</Text>
                      <Text style={[styles.loanInfoAmountValue, { color: COLORS.success }]}>
                        {formatCurrency(selectedLoan.montant_rembourse)}
                      </Text>
                    </View>
                    <View style={styles.loanInfoAmountRow}>
                      <Text style={styles.loanInfoAmountLabel}>Restant:</Text>
                      <Text style={[styles.loanInfoAmountValue, { color: COLORS.error }]}>
                        {formatCurrency(selectedLoan.montant_restant)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Formulaire */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>
                  Montant du remboursement <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={repaymentAmount}
                  onChangeText={setRepaymentAmount}
                  placeholder="Montant en FCFA"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />

                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={repaymentNotes}
                  onChangeText={setRepaymentNotes}
                  placeholder="Notes sur ce remboursement..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeRepaymentModal}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.confirmButton,
                    { 
                      opacity: (!repaymentAmount.trim() || createRepayment.isPending) ? 0.5 : 1 
                    }
                  ]}
                  onPress={handleCreateRepayment}
                  disabled={!repaymentAmount.trim() || createRepayment.isPending}
                >
                  {createRepayment.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal détail emprunt */}
      <Modal 
        visible={showLoanDetailModal} 
        animationType="slide" 
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContainer}>
            <LinearGradient
              colors={[YELLOW_THEME.primary, YELLOW_THEME.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Détail de l'Emprunt</Text>
              <TouchableOpacity onPress={() => setShowLoanDetailModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              {selectedLoan && (
                <>
                  {/* Informations générales */}
                  <View style={styles.loanDetailSection}>
                    <View style={styles.loanDetailHeader}>
                      <View style={styles.loanDetailAvatar}>
                        <Text style={styles.loanDetailAvatarText}>
                          {selectedLoan.membre_nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.loanDetailInfo}>
                        <Text style={styles.loanDetailMemberName}>{selectedLoan.membre_nom}</Text>
                        <Text style={styles.loanDetailMemberNumber}>{selectedLoan.membre_numero}</Text>
                        <Text style={styles.loanDetailSession}>{selectedLoan.session_nom}</Text>
                      </View>
                    </View>

                    {/* Résumé financier */}
                    <View style={styles.loanDetailFinancial}>
                      <View style={styles.loanDetailFinancialRow}>
                        <Text style={styles.loanDetailFinancialLabel}>Montant emprunté:</Text>
                        <Text style={styles.loanDetailFinancialValue}>
                          {formatCurrency(selectedLoan.montant_emprunte)}
                        </Text>
                      </View>
                      <View style={styles.loanDetailFinancialRow}>
                        <Text style={styles.loanDetailFinancialLabel}>Taux d'intérêt:</Text>
                        <Text style={styles.loanDetailFinancialValue}>
                          {selectedLoan.taux_interet}%
                        </Text>
                      </View>
                      <View style={styles.loanDetailFinancialRow}>
                        <Text style={styles.loanDetailFinancialLabel}>Total à rembourser:</Text>
                        <Text style={[styles.loanDetailFinancialValue, { color: YELLOW_THEME.primaryDark }]}>
                          {formatCurrency(selectedLoan.montant_total_a_rembourser)}
                        </Text>
                      </View>
                      <View style={styles.loanDetailFinancialRow}>
                        <Text style={styles.loanDetailFinancialLabel}>Remboursé:</Text>
                        <Text style={[styles.loanDetailFinancialValue, { color: COLORS.success }]}>
                          {formatCurrency(selectedLoan.montant_rembourse)}
                        </Text>
                      </View>
                      <View style={styles.loanDetailFinancialRow}>
                        <Text style={styles.loanDetailFinancialLabel}>Restant:</Text>
                        <Text style={[styles.loanDetailFinancialValue, { color: COLORS.error }]}>
                          {formatCurrency(selectedLoan.montant_restant)}
                        </Text>
                      </View>
                      <View style={styles.loanDetailFinancialRow}>
                        <Text style={styles.loanDetailFinancialLabel}>Progression:</Text>
                        <Text style={[styles.loanDetailFinancialValue, { color: YELLOW_THEME.primary }]}>
                          {Math.round(selectedLoan.pourcentage_rembourse)}%
                        </Text>
                      </View>
                    </View>

                    {/* Notes */}
                    {selectedLoan.notes && (
                      <View style={styles.loanDetailNotes}>
                        <Text style={styles.loanDetailNotesTitle}>Notes:</Text>
                        <Text style={styles.loanDetailNotesText}>{selectedLoan.notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Historique des remboursements */}
                  <View style={styles.repaymentsHistorySection}>
                    <Text style={styles.repaymentsHistoryTitle}>
                      Historique des remboursements ({selectedLoan.remboursements.length})
                    </Text>
                    
                    {selectedLoan.remboursements.length > 0 ? (
                      <View style={styles.repaymentsHistoryList}>
                        {selectedLoan.remboursements.map((repayment) => (
                          <View key={repayment.id} style={styles.repaymentHistoryItem}>
                            <View style={styles.repaymentHistoryHeader}>
                              <Text style={styles.repaymentHistoryDate}>
                                {formatDate(repayment.date_remboursement)}
                              </Text>
                              <Text style={styles.repaymentHistoryAmount}>
                                {formatCurrency(repayment.montant)}
                              </Text>
                            </View>
                            <View style={styles.repaymentHistoryBreakdown}>
                              <Text style={styles.repaymentHistoryBreakdownText}>
                                Capital: {formatCurrency(repayment.montant_capital)} • 
                                Intérêts: {formatCurrency(repayment.montant_interet)}
                              </Text>
                            </View>
                            {repayment.notes && (
                              <Text style={styles.repaymentHistoryNotes}>
                                {repayment.notes}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noRepaymentsText}>
                        Aucun remboursement enregistré pour cet emprunt.
                      </Text>
                    )}
                  </View>

                  {/* Action */}
                  {selectedLoan.statut !== 'REMBOURSE' && (
                    <TouchableOpacity
                      style={styles.addRepaymentModalButton}
                      onPress={() => {
                        setShowLoanDetailModal(false);
                        handleAddRepayment(selectedLoan);
                      }}
                    >
                      <Ionicons name="add" size={20} color="white" />
                      <Text style={styles.addRepaymentModalButtonText}>Ajouter un remboursement</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: YELLOW_THEME.background,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    alignItems: "center",
    marginTop:50,
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
    backgroundColor: YELLOW_THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: YELLOW_THEME.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: FONT_SIZES.xs,
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
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  loansListContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  repaymentsListContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  recentLoansSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  // Stats
  statsGrid: {
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: YELLOW_THEME.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
    shadowColor: YELLOW_THEME.shadow,
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
    color: YELLOW_THEME.text,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
  },
  statSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    marginTop: SPACING.xs,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: YELLOW_THEME.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
    gap: SPACING.sm,
    marginBottom:SPACING.md,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: YELLOW_THEME.textDark,
    paddingVertical: SPACING.md,
  },

  // Add Button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: YELLOW_THEME.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  addButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: "white",
  },

  // Loan Card
  loanCard: {
    backgroundColor: YELLOW_THEME.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
    shadowColor: YELLOW_THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  loanMemberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  loanAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  loanAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  loanDetails: {
    flex: 1,
  },
  loanMemberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.xs,
  },
  loanMemberNumber: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  loanSession: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    marginTop: SPACING.xs,
  },
  loanStatusContainer: {
    alignItems: "flex-end",
  },
  loanStatusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  loanStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Loan Amounts
  loanAmounts: {
    marginBottom: SPACING.md,
  },
  loanAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  loanAmountLabel: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  loanAmountValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: YELLOW_THEME.textDark,
  },

  // Progress
  progressSection: {
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.textDark,
    fontWeight: "600",
  },
  progressPercentage: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: YELLOW_THEME.surface,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },

  // Loan Footer
  loanFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loanInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  loanInfoText: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  addRepaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: YELLOW_THEME.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  addRepaymentButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: "white",
  },

  // Repayment Card
  repaymentCard: {
    backgroundColor: YELLOW_THEME.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: YELLOW_THEME.primary,
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
    shadowColor: YELLOW_THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  repaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  repaymentMemberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  repaymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${YELLOW_THEME.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  repaymentDetails: {
    flex: 1,
  },
  repaymentMemberName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.xs,
  },
  repaymentMemberNumber: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  repaymentAmount: {
    alignItems: "flex-end",
  },
  repaymentAmountValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: YELLOW_THEME.primary,
    marginBottom: SPACING.xs,
  },
  repaymentDate: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  repaymentBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  repaymentBreakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  repaymentBreakdownLabel: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  repaymentBreakdownValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: YELLOW_THEME.textDark,
  },
  repaymentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repaymentSessionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  repaymentSessionText: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  repaymentNotes: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    fontStyle: "italic",
    flex: 1,
    marginLeft: SPACING.md,
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
    color: YELLOW_THEME.text,
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
    color: YELLOW_THEME.text,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: YELLOW_THEME.primary,
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
    color: YELLOW_THEME.textDark,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: YELLOW_THEME.text,
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
    backgroundColor: YELLOW_THEME.background,
    borderRadius: BORDER_RADIUS.xl,
    width: "100%",
    maxHeight: "85%",
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
    maxHeight: "100%",
  },

  // Member Selection
  memberSelectionSection: {
    marginBottom: SPACING.lg,
    marginTop:SPACING.lg,
  },
  membersListModal: {
    height: 290,
    overflow:'scroll',
  },
  memberCardModal: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  memberModalInfo: {
    flex: 1,
  },
  memberModalName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.xs,
  },
  memberModalNumber: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  memberModalEmail: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    marginTop: SPACING.xs,
  },
  noMembersText: {
    textAlign: "center",
    color: YELLOW_THEME.text,
    fontSize: FONT_SIZES.sm,
    padding: SPACING.md,
  },

  // Form
  formSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: YELLOW_THEME.textDark,
    backgroundColor: YELLOW_THEME.surfaceLight,
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
    backgroundColor: YELLOW_THEME.surface,
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
  },
  confirmButton: {
    backgroundColor: YELLOW_THEME.primary,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: YELLOW_THEME.text,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },

  // Loan Info Section
  loanInfoSection: {
    backgroundColor: YELLOW_THEME.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: YELLOW_THEME.border,
    marginTop:15,
  },
  loanInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  loanInfoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: YELLOW_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  loanInfoAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  loanInfoDetails: {
    flex: 1,
  },
  loanInfoMemberName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.xs,
  },
  loanInfoMemberNumber: {
    fontSize: FONT_SIZES.md,
    color: YELLOW_THEME.text,
  },
  loanInfoAmounts: {
    gap: SPACING.sm,
  },
  loanInfoAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loanInfoAmountLabel: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  loanInfoAmountValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: YELLOW_THEME.textDark,
  },

  // Loan Detail Section
  loanDetailSection: {
    marginBottom: SPACING.lg,
    marginTop:SPACING.lg,
  },
  loanDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: YELLOW_THEME.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  loanDetailAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: YELLOW_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  loanDetailAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },
  loanDetailInfo: {
    flex: 1,
  },
  loanDetailMemberName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.xs,
  },
  loanDetailMemberNumber: {
    fontSize: FONT_SIZES.md,
    color: YELLOW_THEME.text,
  },
  loanDetailSession: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    marginTop: SPACING.xs,
  },
  loanDetailFinancial: {
    backgroundColor: YELLOW_THEME.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  loanDetailFinancialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loanDetailFinancialLabel: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  loanDetailFinancialValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: YELLOW_THEME.textDark,
  },
  loanDetailNotes: {
    backgroundColor: YELLOW_THEME.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  loanDetailNotesTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.xs,
  },
  loanDetailNotesText: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    fontStyle: "italic",
  },

  // Repayments History
  repaymentsHistorySection: {
    marginBottom: SPACING.lg,
  },
  repaymentsHistoryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: YELLOW_THEME.textDark,
    marginBottom: SPACING.md,
  },
  repaymentsHistoryList: {
    maxHeight: 200,
  },
  repaymentHistoryItem: {
    backgroundColor: YELLOW_THEME.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: YELLOW_THEME.primary,
  },
  repaymentHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  repaymentHistoryDate: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  repaymentHistoryAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: YELLOW_THEME.primary,
  },
  repaymentHistoryBreakdown: {
    marginBottom: SPACING.xs,
  },
  repaymentHistoryBreakdownText: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
  },
  repaymentHistoryNotes: {
    fontSize: FONT_SIZES.sm,
    color: YELLOW_THEME.text,
    fontStyle: "italic",
  },
  noRepaymentsText: {
    textAlign: "center",
    color: YELLOW_THEME.text,
    fontSize: FONT_SIZES.sm,
    padding: SPACING.lg,
  },

  // Add Repayment Modal Button
  addRepaymentModalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: YELLOW_THEME.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  addRepaymentModalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "white",
  },
  // Member Financial Info
memberFinancialInfo: {
  marginTop: SPACING.sm,
  gap: SPACING.xs,
},
financialInfoRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: SPACING.xs,
},
financialInfoText: {
  fontSize: FONT_SIZES.sm,
  color: YELLOW_THEME.text,
},

// Selected Member Summary
selectedMemberSummary: {
  backgroundColor: YELLOW_THEME.surface,
  padding: SPACING.md,
  borderRadius: BORDER_RADIUS.lg,
  marginTop: SPACING.md,
  borderWidth: 1,
  borderColor: YELLOW_THEME.border,
},
selectedMemberTitle: {
  fontSize: FONT_SIZES.md,
  fontWeight: "bold",
  color: YELLOW_THEME.textDark,
  marginBottom: SPACING.sm,
},
selectedMemberDetails: {
  gap: SPACING.sm,
},
selectedMemberName: {
  fontSize: FONT_SIZES.md,
  fontWeight: "600",
  color: YELLOW_THEME.primary,
  marginBottom: SPACING.xs,
},
selectedMemberFinancials: {
  gap: SPACING.xs,
},
summaryRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
summaryLabel: {
  fontSize: FONT_SIZES.sm,
  color: YELLOW_THEME.text,
},
summaryValue: {
  fontSize: FONT_SIZES.sm,
  fontWeight: "600",
  color: YELLOW_THEME.textDark,
},
});