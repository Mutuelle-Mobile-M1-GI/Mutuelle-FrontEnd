import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ListRenderItem,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useAdminDashboard } from "../../hooks/useDashboard";
import { useLoans } from "../../hooks/useLoan";
import { useRenflouements } from "../../hooks/useRenflouement";
import { useSolidarityPayments, useSocialFundCurrent } from "../../hooks/useSolidarity";
import { useAssistances } from "../../hooks/useAssistance";
import { useMembers } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { Loan } from "../../types/loan.types";
import { Renflouement } from "../../types/renflouement.types";
import { Assistance } from "../../types/assistance.types";
import { Member } from "../../types/member.types";
import { useNavigation } from "@react-navigation/native";
import { useSavingsStats } from "../../hooks/useSaving"; 

const { width } = Dimensions.get("window");

// 🎯 Interface pour les stats calculées
interface CalculatedStats {
  empruntsEnCours: number;
  empruntsTotal: number;
  tresorTotal: number;
  fondsSocialTotal: number;
  membresTotal: number;
  membresEnRegle: number;
  membresNonEnRegle: number;
  membresComplets: number;
  inscriptionsTotal: number;
  renflouementDu: number;
  renflouementPaye: number;
  tauxRecouvrement: number;
  situationNette: number;
  assistancesPayees: number;
  assistancesTotales: number;
  montantAssistances: number;
}

// 🎯 Composant MetricCard moderne
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  gradient: [string, string];
  trend?: "up" | "down" | "stable";
  percentage?: number;
  onPress?: () => void;
}

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  gradient, 
  trend, 
  percentage, 
  onPress 
}: MetricCardProps) => (
  <TouchableOpacity 
    style={styles.metricCard} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={gradient}
      style={styles.metricCardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.metricHeader}>
        <View style={styles.metricIcon}>
          <Ionicons name={icon as any} size={24} color="white" />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons 
              name={trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "remove"} 
              size={16} 
              color="white" 
            />
          </View>
        )}
      </View>
      
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      
      {typeof percentage === "number" && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{percentage.toFixed(1)}%</Text>
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

// 🎯 Composant SectionHeader
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const SectionHeader = ({ title, subtitle, icon, color, action }: SectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleContainer}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.sectionTextContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {action && (
      <TouchableOpacity style={styles.sectionAction} onPress={action.onPress}>
        <Text style={[styles.sectionActionText, { color }]}>{action.label}</Text>
        <Ionicons name="chevron-forward" size={16} color={color} />
      </TouchableOpacity>
    )}
  </View>
);



// 🎯 Modal détaillé
interface DetailModalProps<T> {
  visible: boolean;
  title: string;
  data: T[];
  renderItem: ListRenderItem<T>;
  onClose: () => void;
  loading?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
}

function DetailModal<T extends { id: string }>({ 
  visible, 
  title, 
  data, 
  renderItem, 
  onClose, 
  loading = false,
  searchable = true,
  emptyMessage = "Aucune donnée disponible"
}: DetailModalProps<T>) {
  const [search, setSearch] = useState("");
  
  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  console.log('🔍 Modal Debug:', { title, dataCount: data.length, filteredCount: filteredData.length, loading });

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, "#3A86FF"]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Search */}
          {searchable && (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher..."
                  placeholderTextColor={COLORS.textLight}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Debug info */}
          {/* <View style={{ padding: 10, backgroundColor: '#f0f0f0' }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Debug: {data.length} éléments • Filtré: {filteredData.length} • Loading: {loading ? 'Oui' : 'Non'}
            </Text>
          </View> */}

          {/* Content */}
          <View style={styles.modalBody}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : filteredData.length > 0 ? (
              <FlatList
                  data={filteredData}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={true}  // 🔧 IMPORTANT: Montre la scrollbar
                  scrollEnabled={true}                 // 🔧 IMPORTANT: Active le scroll
                  nestedScrollEnabled={true}           // 🔧 IMPORTANT: Pour modal
                  bounces={true}                       // 🔧 Effet de rebond iOS
                  style={{
                    flex: 1,                          // 🔧 IMPORTANT: Prend tout l'espace
                  }}
                  contentContainerStyle={{
                    paddingVertical: SPACING.md,       // 🔧 Padding pour le contenu
                    flexGrow: 1,                      // 🔧 IMPORTANT: Permet de grandir
                  }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  removeClippedSubviews={false}       // 🔧 Assure que tout reste visible
                  keyboardShouldPersistTaps="handled" // 🔧 Pour la recherche
                />

            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Aucune donnée</Text>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
                <Text style={styles.emptyText}>
                  Total disponible: {data.length} • Recherche: "{search}"
                </Text>
              </View>
            )}
          </View>

          
        </View>
      </View>
    </Modal>
  );
}

// 🎯 Composant principal
export default function FinancialReportsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data: serverStats, isLoading: loadingStats, refetch: refetchServerStats } = useSavingsStats();

  // 🔧 Hooks de données avec protection
  const { data: dashboard, isLoading, refetch } = useAdminDashboard();
  const { data: loansData, isLoading: loadingLoans } = useLoans();
  const { data: renflouementsData, isLoading: loadingRenf } = useRenflouements();
  const { data: solidarityData, isLoading: loadingSolid } = useSolidarityPayments();
  const { data: assistancesData, isLoading: loadingAssist } = useAssistances();
  const { data: membersData, isLoading: loadingMembers } = useMembers();
  const { data: socialFund, isLoading: loadingFund } = useSocialFundCurrent();
  const { data: currentSession } = useCurrentSession();

  // 🔧 Protection contre les valeurs undefined avec debug
  const loans = Array.isArray(loansData) ? loansData : [];
  const renflouements = Array.isArray(renflouementsData) ? renflouementsData : [];
  const solidarity = Array.isArray(solidarityData) ? solidarityData : [];
  const assistances = Array.isArray(assistancesData) ? assistancesData : [];
  const members = Array.isArray(membersData) ? membersData : [];

  // Debug logs
  console.log('🔍 Debug données finales:', {
    members: { count: members.length, loading: loadingMembers, raw: membersData },
    loans: { count: loans.length, loading: loadingLoans },
    renflouements: { count: renflouements.length, loading: loadingRenf },
    assistances: { count: assistances.length, loading: loadingAssist },
  });
  const navigation=useNavigation();
  const handleDetailPress = ( route: string) => {
    console.log(`Navigation vers ${route}`);
    navigation.navigate(route);
  };

  // Formatage monétaire
  const formatCurrency = (amount: number | undefined | null): string => {
    if ( !amount || isNaN(amount)) return "0 FCFA";
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

// 🔧 Statistiques calculées avec protection COMPLÈTE
  const stats = useMemo((): CalculatedStats => {
    // --- 1. DONNÉES DU SERVEUR (Hook useSavingsStats / Django) ---
    const reelTresor = serverStats?.tresor_total ?? 0; 
    const epargneGlobaleMembres = serverStats?.epargne_totale ?? 0;
    const solidariteGlobale = serverStats?.solidarite_totale ?? 0; // Si dispo, sinon fallback

    // --- 2. DONNÉES DU DASHBOARD ---
    const empruntsEnCours = dashboard?.emprunts_en_cours?.nombre ?? 0;
    const empruntsTotal = dashboard?.emprunts_en_cours?.montant_total_attendu ?? 0;
    const fondsSocialTotal = dashboard?.fonds_social?.montant_total ?? solidariteGlobale;
    
    // --- 3. LOGIQUE MEMBRES ---
    const membresTotal = members.length;
    const membresEnRegle = members.filter(m => m?.statut === "EN_REGLE").length;
    const membresNonEnRegle = membresTotal - membresEnRegle;
    const membresComplets = members.filter(m => 
      m?.donnees_financieres?.inscription?.inscription_complete
    ).length;
    
    const inscriptionsTotal = members.reduce((sum, m) => 
      sum + (m?.donnees_financieres?.inscription?.montant_paye_inscription ?? 0), 0
    );

    // --- 4. RENFLOUEMENTS & ASSISTANCES ---
    const renflouementDu = dashboard?.renflouements?.montants?.total_du ?? 
      renflouements.reduce((sum, r) => sum + (r?.montant_du ?? 0), 0);
    const renflouementPaye = dashboard?.renflouements?.montants?.total_paye ?? 
      renflouements.reduce((sum, r) => sum + (r?.montant_paye ?? 0), 0);
    const tauxRecouvrement = dashboard?.renflouements?.pourcentages?.taux_recouvrement ?? 
      (renflouementDu > 0 ? (renflouementPaye / renflouementDu) * 100 : 100);
    
    const assistancesPayees = assistances.filter(a => a?.statut === "PAYEE").length;
    const assistancesTotales = assistances.length;
    const montantAssistances = assistances
      .filter(a => a?.statut === "PAYEE")
      .reduce((sum, a) => sum + (a?.montant ?? 0), 0);

    // --- 5. CALCUL DE LA SITUATION NETTE (LA CORRECTION) ---
    // Formule : (Cash en Caisse + Créances/Prêts à percevoir) - Dettes envers les membres (Épargnes)
    const situationNette = (reelTresor + empruntsTotal) - epargneGlobaleMembres;

    return {
      empruntsEnCours,
      empruntsTotal,      // Argent "dehors"
      tresorTotal: reelTresor, // Argent "dedans" (inclut les remboursements)
      fondsSocialTotal,
      membresTotal,
      membresEnRegle,
      membresNonEnRegle,
      membresComplets,
      inscriptionsTotal,
      renflouementDu,
      renflouementPaye,
      tauxRecouvrement,
      situationNette,    // Bilan de santé réel
      assistancesPayees,
      assistancesTotales,
      montantAssistances,
    };
  }, [dashboard, serverStats, members, renflouements, assistances]);

  // N'oublie pas de mettre à jour ton rafraîchissement également :
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),             // Dashboard
        refetchServerStats()   // Nouvelles Stats
      ]);
    } catch (error) {
      console.error("Erreur de rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // 📄 Génération PDF (simplifié)
  const generatePDF = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Bilan Financier - Mutuelle ENSP</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
              .title { color: #2563EB; font-size: 24px; font-weight: bold; }
              .subtitle { color: #666; margin-top: 10px; }
              .section { margin-bottom: 30px; }
              .section-title { color: #2563EB; font-size: 18px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
              .grid { display: flex; flex-wrap: wrap; gap: 20px; }
              .metric { flex: 1; min-width: 200px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
              .metric-title { font-weight: bold; color: #333; }
              .metric-value { font-size: 20px; color: #2563EB; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">BILAN FINANCIER</div>
              <div class="subtitle">Mutuelle des Enseignants - ENSP Yaoundé</div>
              <div class="subtitle">Session: ${currentSession?.nom || "N/A"}</div>
              <div class="subtitle">Généré le: ${new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <div class="section">
              <div class="section-title">INDICATEURS GLOBAUX</div>
              <div class="grid">
                <div class="metric">
                  <div class="metric-title">Trésor Total</div>
                  <div class="metric-value">${formatCurrency(stats.tresorTotal)}</div>
                </div>
                <div class="metric">
                  <div class="metric-title">Membres Total</div>
                  <div class="metric-value">${stats.membresTotal}</div>
                </div>
                <div class="metric">
                  <div class="metric-title">Membres En Règle</div>
                  <div class="metric-value">${stats.membresEnRegle}</div>
                </div>
                <div class="metric">
                  <div class="metric-title">Situation Nette</div>
                  <div class="metric-value">${formatCurrency(stats.situationNette)}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Bilan Financier - Mutuelle ENSP'
      });

    } catch (error) {
      console.error('Erreur génération PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  // 🔧 Rendus des items pour modals - Avec debug
  const renderMemberItem: ListRenderItem<Member> = ({ item: member, index }) => {
    // 🔍 DEBUG COMPLET
    console.log(`🔍 Render member ${index}:`, {
      id: member?.id,
      utilisateur: member?.utilisateur,
      nom_complet: member?.utilisateur?.nom_complet,
      statut: member?.statut,
      structure_complete: member
    });
  
    // Vérification des données critiques
    if (!member) {
      console.log('❌ Member est null/undefined');
      return (
        <View style={styles.listItem}>
          <Text style={styles.errorText}>Membre non défini</Text>
        </View>
      );
    }
  
    if (!member.id) {
      console.log('❌ Member.id manquant');
      return (
        <View style={styles.listItem}>
          <Text style={styles.errorText}>ID membre manquant</Text>
        </View>
      );
    }
  
    const financial = member?.donnees_financieres;
    
    return (
      <View style={[styles.listItem, { backgroundColor: '#f0f8ff', borderWidth: 2, borderColor: '#blue' }]}>
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemName}>
            {member?.utilisateur?.nom_complet || member?.utilisateur.first_name || `Membre ${member.id}`}
          </Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: member?.statut === "EN_REGLE" ? COLORS.success : COLORS.error 
          }]}>
            <Text style={styles.statusBadgeText}>{member?.statut || "N/A"}</Text>
          </View>
        </View>
        <View style={styles.memberFinancials}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Email:</Text>
            <Text style={styles.financialValue}>
              {member?.utilisateur?.email  || "N/A"}
            </Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Numéro:</Text>
            <Text style={styles.financialValue}>
              {member?.numero_membre || "N/A"}
            </Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>ID:</Text>
            <Text style={styles.financialValue}>
              {member?.id}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  const renderLoanItem: ListRenderItem<Loan> = ({ item: loan }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemName}>{loan?.membre_info?.nom_complet || "N/A"}</Text>
        <Text style={[styles.listItemStatus, { 
          color: loan?.statut === "EN_COURS" ? COLORS.warning : COLORS.success 
        }]}>
          {loan?.statut_display || loan?.statut}
        </Text>
      </View>
      <View style={styles.listItemDetails}>
        <Text style={styles.listItemDetail}>
          Emprunté: {formatCurrency(loan?.montant_emprunte)}
        </Text>
        <Text style={styles.listItemDetail}>
          Restant: {formatCurrency(loan?.montant_restant_a_rembourser)}
        </Text>
        <Text style={styles.listItemDetail}>
          Session: {loan?.session_nom || "N/A"}
        </Text>
      </View>
    </View>
  );

  const renderRenflouementItem: ListRenderItem<Renflouement> = ({ item: renf }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemName}>{renf?.membre_info?.nom_complet || "N/A"}</Text>
        <Text style={[styles.listItemStatus, { 
          color: renf?.is_solde ? COLORS.success : COLORS.error 
        }]}>
          {renf?.is_solde ? "Soldé" : "En cours"}
        </Text>
      </View>
      <View style={styles.listItemDetails}>
        <Text style={styles.listItemDetail}>Dû: {formatCurrency(renf?.montant_du)}</Text>
        <Text style={styles.listItemDetail}>Payé: {formatCurrency(renf?.montant_paye)}</Text>
        <Text style={styles.listItemDetail}>Cause: {renf?.cause || "N/A"}</Text>
      </View>
    </View>
  );

  const renderAssistanceItem: ListRenderItem<Assistance> = ({ item: assist }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemName}>{assist?.membre_info?.nom_complet || "N/A"}</Text>
        <Text style={[styles.listItemStatus, { 
          color: assist?.statut === "PAYEE" ? COLORS.success : COLORS.warning 
        }]}>
          {assist?.statut_display || assist?.statut}
        </Text>
      </View>
      <View style={styles.listItemDetails}>
        <Text style={styles.listItemDetail}>
          Type: {assist?.type_assistance_info?.nom || "N/A"}
        </Text>
        <Text style={styles.listItemDetail}>
          Montant: {formatCurrency(assist?.montant)}
        </Text>
        <Text style={styles.listItemDetail}>
          Date: {assist?.date_demande ? new Date(assist.date_demande).toLocaleDateString('fr-FR') : "N/A"}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du bilan...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header avec bouton PDF */}
      <LinearGradient
        colors={[COLORS.primary, "#3A86FF"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Bilan Financier</Text>
            <Text style={styles.headerSubtitle}>
              Session: {currentSession?.nom || "Aucune session active"}
            </Text>
            <Text style={styles.headerDate}>
              MAJ: {new Date().toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
            <Ionicons name="document-text" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
{/* Métriques principales - Version Corrigée */}
<View style={styles.metricsGrid}>
  <MetricCard
    title="Trésor Total"
    value={formatCurrency(stats.tresorTotal)}
    subtitle="Liquidités en caisse" 
    icon="wallet-outline"
    gradient={[COLORS.primary, "#3A86FF"]}
    trend={stats.tresorTotal > 0 ? "up" : "down"}
    onPress={() => setActiveModal("members")}
  />
  
  <MetricCard
    title="Fonds Social"
    value={formatCurrency(stats.fondsSocialTotal)}
    subtitle="Réserve de solidarité"
    icon="heart-outline"
    gradient={[COLORS.success, "#57CC99"]}
    trend="stable"
  />
</View>

<View style={styles.metricsGrid}>
  <MetricCard
    title="Emprunts"
    value={formatCurrency(stats.empruntsTotal)}
    subtitle={`${stats.empruntsEnCours} prêt(s) à recouvrer`}
    icon="cash-outline"
    gradient={[COLORS.warning, "#FCBF49"]}
    trend="down"
    onPress={() => setActiveModal("loans")}
  />
  
  <MetricCard
    title="Situation Nette"
    value={formatCurrency(stats.situationNette)}
    subtitle={stats.situationNette >= 0 ? "Bilan Excédentaire" : "Bilan Déficitaire"}
    icon={stats.situationNette >= 0 ? "shield-checkmark-outline" : "alert-circle-outline"}
    // Changement dynamique de couleur : Gris foncé si positif, Rouge vif si négatif
    gradient={stats.situationNette >= 0 ? ["#4B5563", "#1F2937"] : [COLORS.error, "#B91C1C"]}
    trend={stats.situationNette >= 0 ? "up" : "down"}
  />
</View>

      {/* Analyse des membres - Section corrigée */}
      <View style={styles.fullWidthSection}>
        <SectionHeader
          title="Analyse des Membres"
          subtitle={`${stats.membresEnRegle}/${stats.membresTotal} en règle`}
          icon="people"
          color={COLORS.primary}
          action={{
            label: "Voir détail",
            onPress: () => {
              console.log('🔍 Ouverture modal membres avec:', members.length, 'membres');
              setActiveModal("members");
            }
          }}
        />
        
        <View style={styles.membersOverview}>
          <View style={styles.membersStat}>
            <Text style={styles.membersStatValue}>{stats.membresTotal}</Text>
            <Text style={styles.membersStatLabel}>Total</Text>
          </View>
          <View style={styles.membersStat}>
            <Text style={[styles.membersStatValue, { color: COLORS.success }]}>
              {stats.membresEnRegle}
            </Text>
            <Text style={styles.membersStatLabel}>En règle</Text>
          </View>
          <View style={styles.membersStat}>
            <Text style={[styles.membersStatValue, { color: COLORS.error }]}>
              {stats.membresNonEnRegle}
            </Text>
            <Text style={styles.membersStatLabel}>Problèmes</Text>
          </View>
          <View style={styles.membersStat}>
            <Text style={[styles.membersStatValue, { color: COLORS.primary }]}>
              {stats.membresTotal > 0 ? ((stats.membresEnRegle / stats.membresTotal) * 100).toFixed(0) : 0}%
            </Text>
            <Text style={styles.membersStatLabel}>Conformité</Text>
          </View>
        </View>
      </View>

      {/* Inscriptions - Section corrigée */}
      <View style={styles.fullWidthSection}>
        <SectionHeader
          title="Inscriptions"
          subtitle={`${stats.membresComplets} complètes sur ${stats.membresTotal}`}
          icon="card"
          color={COLORS.success}
          action={{
            label: "Voir détail",
            onPress: () => {
              handleDetailPress("InscriptionsScreen")
            }
          }}
        />
        
        <View style={styles.inscriptionsOverview}>
          <View style={styles.inscriptionStat}>
            <Text style={styles.inscriptionValue}>{formatCurrency(stats.inscriptionsTotal)}</Text>
            <Text style={styles.inscriptionLabel}>Total perçu</Text>
          </View>
          <View style={styles.inscriptionStat}>
            <Text style={[styles.inscriptionValue, { color: COLORS.success }]}>
              {stats.membresComplets}
            </Text>
            <Text style={styles.inscriptionLabel}>Complètes</Text>
          </View>
          <View style={styles.inscriptionStat}>
            <Text style={[styles.inscriptionValue, { color: COLORS.warning }]}>
              {stats.membresTotal - stats.membresComplets}
            </Text>
            <Text style={styles.inscriptionLabel}>En cours</Text>
          </View>
        </View>
      </View>

      {/* Renflouements - Section corrigée */}
      <View style={styles.fullWidthSection}>
        <SectionHeader
          title="Renflouements"
          subtitle={`${stats.tauxRecouvrement.toFixed(1)}% de recouvrement`}
          icon="refresh-circle"
          color={COLORS.warning}
          action={{
            label: "Gérer",
            onPress: () => setActiveModal("renflouements")
          }}
        />
        
        <View style={styles.renflouementOverview}>
          <View style={styles.renflouementStat}>
            <Text style={styles.renflouementValue}>{formatCurrency(stats.renflouementDu)}</Text>
            <Text style={styles.renflouementLabel}>Total dû</Text>
          </View>
          <View style={styles.renflouementStat}>
            <Text style={[styles.renflouementValue, { color: COLORS.success }]}>
              {formatCurrency(stats.renflouementPaye)}
            </Text>
            <Text style={styles.renflouementLabel}>Payé</Text>
          </View>
          <View style={styles.renflouementStat}>
            <Text style={[styles.renflouementValue, { color: COLORS.primary }]}>
              {stats.tauxRecouvrement.toFixed(1)}%
            </Text>
            <Text style={styles.renflouementLabel}>Recouvrement</Text>
          </View>
        </View>
      </View>

      {/* Activité récente */}
      {dashboard?.activite_recente && (
        <View style={styles.fullWidthSection}>
          <SectionHeader
            title="Activité récente"
            icon="pulse"
            color={COLORS.primary}
          />
          
          <View style={styles.activityGrid}>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>
                {dashboard.activite_recente.nouveaux_membres ?? 0}
              </Text>
              <Text style={styles.activityLabel}>Nouveaux membres</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>
                {dashboard.activite_recente.nouveaux_emprunts ?? 0}
              </Text>
              <Text style={styles.activityLabel}>Nouveaux emprunts</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>
                {dashboard.activite_recente.assistances_demandees ?? 0}
              </Text>
              <Text style={styles.activityLabel}>Assistances</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>
                {formatCurrency(dashboard.activite_recente.total_paiements)}
              </Text>
              <Text style={styles.activityLabel}>Total paiements</Text>
            </View>
          </View>
        </View>
      )}

      {/* Modals détaillés avec debug */}
      <DetailModal
        visible={activeModal === "members"}
        title={`Liste des membres (${members.length})`}
        data={members}
        renderItem={renderMemberItem}
        onClose={() => setActiveModal(null)}
        loading={loadingMembers}
        emptyMessage={`Aucun membre trouvé. Total chargé: ${members.length}`}
      />

      <DetailModal
        visible={activeModal === "loans"}
        title="Emprunts en cours"
        data={loans}
        renderItem={renderLoanItem}
        onClose={() => setActiveModal(null)}
        loading={loadingLoans}
        emptyMessage="Aucun emprunt en cours"
      />

      <DetailModal
        visible={activeModal === "renflouements"}
        title="Renflouements"
        data={renflouements}
        renderItem={renderRenflouementItem}
        onClose={() => setActiveModal(null)}
        loading={loadingRenf}
        emptyMessage="Aucun renflouement"
      />

      <DetailModal
        visible={activeModal === "assistances"}
        title="Assistances accordées"
        data={assistances}
        renderItem={renderAssistanceItem}
        onClose={() => setActiveModal(null)}
        loading={loadingAssist}
        emptyMessage="Aucune assistance accordée"
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
    marginBottom: SPACING.xs,
  },
  headerDate: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.6)",
  },
  pdfButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Métriques - CORRIGÉES
  metricsGrid: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricCardGradient: {
    padding: SPACING.md,
    minHeight: 120,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendContainer: {
    padding: SPACING.xs,
  },
  metricTitle: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.8)",
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
  },
  metricSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: "rgba(255,255,255,0.6)",
    marginBottom: SPACING.sm,
  },

  // Sections - CORRIGÉES pour éviter le décalage
  fullWidthSection: {
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  sectionActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  // Membres overview - CORRIGÉ
  membersOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  membersStat: {
    alignItems: "center",
  },
  membersStatValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
  },
  membersStatLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Inscriptions overview - CORRIGÉ
  inscriptionsOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inscriptionStat: {
    alignItems: "center",
    flex: 1,
  },
  inscriptionValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  inscriptionLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: "center",
  },

  // Renflouements overview - NOUVEAU
  renflouementOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  renflouementStat: {
    alignItems: "center",
    flex: 1,
  },
  renflouementValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  renflouementLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: "center",
  },

  // Activité - CORRIGÉ
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  activityItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  activityLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Progress
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 2,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
    marginTop: SPACING.xs,
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
    height: "60%",  // 🔧 CHANGÉ: hauteur fixe au lieu de maxHeight
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    
  },
  modalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchInputContainer: {
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
  modalBody: {
  flex: 1,           // 🔧 GARDE flex: 1
  paddingHorizontal: SPACING.lg,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.md,  // 🔧 AJOUTE padding bottom

  },

  // Liste items
  listItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  listItemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  listItemStatus: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  listItemDetails: {
    gap: SPACING.xs,
  },
  listItemDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "bold",
    color: "white",
  },
  separator: {
    height: SPACING.md,
  },

  // Financials members
  memberFinancials: {
    gap: SPACING.xs,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  financialLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
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
    marginBottom: SPACING.sm,
  },
});