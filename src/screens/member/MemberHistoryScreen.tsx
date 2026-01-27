import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "../../context/AuthContext";
import { useMemberDetailByUser } from "../../hooks/useMember";
import { useLoans, useRepayments } from "../../hooks/useLoan";
import { useCurrentSession } from "../../hooks/useSession";
import { useSolidarityPayments } from "../../hooks/useSolidarity";
import { useRenflouements } from "../../hooks/useRenflouement";
import { useSavings } from "../../hooks/useSaving";
import { useAssistancesByMember } from "../../hooks/useAssistance";
import { useInscriptionPayments } from "../../hooks/useInscription";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// � Configuration de la pagination
const ITEMS_PER_PAGE = 10;

// �🎨 Design System Premium
const PREMIUM_THEME = {
  colors: {
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: COLORS.primary,
      600: '#2563EB',
      700: '#1D4ED8',
    },
    success: {
      50: '#ECFDF5',
      500: '#10B981',
      600: '#059669',
    },
    warning: {
      50: '#FFFBEB',
      500: '#F59E0B',
      600: '#D97706',
    },
    error: {
      50: '#FEF2F2',
      500: '#EF4444',
      600: '#DC2626',
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      400: '#A3A3A3',
      600: '#525252',
      800: '#262626',
      900: '#171717',
    }
  },
  gradients: {
    primary: [COLORS.primary, '#2563EB'],
    success: ['#10B981', '#059669'],
    warning: ['#F59E0B', '#D97706'],
    error: ['#EF4444', '#DC2626'],
    glass: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'],
  }
};

// 💰 Formatage premium
const formatMoney = (val: number | string | undefined, compact = false) => {
  if (typeof val === "string") val = parseFloat(val);
  if (typeof val !== "number" || isNaN(val)) return "--";
  
  if (compact && val >= 1000000) {
    return `${(val / 1000000).toFixed(1)}M FCFA`;
  }
  if (compact && val >= 1000) {
    return `${Math.round(val / 1000)}K FCFA`;
  }
  
  return `${val.toLocaleString("fr-FR")} FCFA`;
};

// 📅 Formatage intelligent des dates
const formatDateSmart = (dateStr: string) => {
  if (!dateStr) return "--";
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr.slice(0, 10);
  }
};

// 🏷️ Types pour timeline
type TimelineItem = {
  id: string;
  type: "emprunt" | "remboursement" | "solidarite" | "renflouement" | "epargne" | "assistance" | "paiement-inscription";
  date: string;
  amount: number;
  data: any;
  status?: string;
  category?: string;
};

// 🎯 Configuration des types d'opérations
const OPERATION_CONFIG = {
  emprunt: {
    label: "Emprunt",
    icon: "trending-up",
    color: PREMIUM_THEME.colors.primary[500],
    gradient: PREMIUM_THEME.gradients.primary,
    bgColor: PREMIUM_THEME.colors.primary[50],
  },
  remboursement: {
    label: "Remboursement",
    icon: "arrow-down-circle",
    color: PREMIUM_THEME.colors.success[500],
    gradient: PREMIUM_THEME.gradients.success,
    bgColor: PREMIUM_THEME.colors.success[50],
  },
  solidarite: {
    label: "Solidarité",
    icon: "people",
    color: PREMIUM_THEME.colors.warning[500],
    gradient: PREMIUM_THEME.gradients.warning,
    bgColor: PREMIUM_THEME.colors.warning[50],
  },
  renflouement: {
    label: "Renflouement",
    icon: "refresh-circle",
    color: PREMIUM_THEME.colors.error[500],
    gradient: PREMIUM_THEME.gradients.error,
    bgColor: PREMIUM_THEME.colors.error[50],
  },
  epargne: {
    label: "Épargne",
    icon: "wallet",
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    bgColor: '#F3E8FF',
  },
  assistance: {
    label: "Assistance",
    icon: "heart",
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
    bgColor: '#FCE7F3',
  },
  'paiement-inscription': {
    label: "Paiement Inscription",
    icon: "school",
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
    bgColor: '#ECFDFE',
  },
};

// 📊 Composant Résumé Financier Premium
const FinancialSummaryCard = ({ member }: { member: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
      },
    ],
  };

  const financialData = member.donnees_financieres?.resume_financier;
  const patrimoine = financialData?.patrimoine_total || 0;
  const obligations = financialData?.obligations_totales || 0;
  const situationNette = financialData?.situation_nette || 0;

  return (
    <Animated.View style={[styles.summaryCard, animatedStyle]}>
      <LinearGradient
        colors={PREMIUM_THEME.gradients.glass}
        style={styles.summaryGradient}
      >
        <View style={styles.summaryHeader}>
          <LinearGradient
            colors={PREMIUM_THEME.gradients.primary}
            style={styles.summaryIcon}
          >
            <Ionicons name="analytics" size={24} color="white" />
          </LinearGradient>
          <Text style={styles.summaryTitle}>Résumé Financier</Text>
        </View>

        <View style={styles.summaryMetrics}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>Patrimoine</Text>
              <Text style={[styles.summaryValue, { color: PREMIUM_THEME.colors.success[600] }]}>
                {formatMoney(patrimoine, true)}
              </Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>Obligations</Text>
              <Text style={[styles.summaryValue, { color: PREMIUM_THEME.colors.warning[600] }]}>
                {formatMoney(obligations, true)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryNetRow}>
            <Text style={styles.summaryNetLabel}>Situation Nette</Text>
            <Text style={[
              styles.summaryNetValue,
              { color: situationNette >= 0 ? PREMIUM_THEME.colors.success[600] : PREMIUM_THEME.colors.error[600] }
            ]}>
              {formatMoney(situationNette)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// 🔍 Composant de recherche et filtres
const SearchAndFilters = ({ 
  searchText, 
  onSearchChange, 
  selectedFilter, 
  onFilterChange,
  totalItems,
  filteredItems 
}: any) => {
  const [showFilters, setShowFilters] = useState(false);

  const filters = [
    { key: 'all', label: 'Tout', icon: 'list' },
    { key: 'emprunt', label: 'Emprunts', icon: 'trending-up' },
    { key: 'remboursement', label: 'Remboursements', icon: 'arrow-down-circle' },
    { key: 'solidarite', label: 'Solidarité', icon: 'people' },
    { key: 'renflouement', label: 'Renflouements', icon: 'refresh-circle' },
    { key: 'epargne', label: 'Épargne', icon: 'wallet' },
    { key: 'assistance', label: 'Assistances', icon: 'heart' },
    { key: 'paiement-inscription', label: 'Inscription', icon: 'school' },
  ];

  return (
    <View style={styles.searchContainer}>
      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.searchGradient}
        >
          <Ionicons name="search" size={20} color={PREMIUM_THEME.colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une opération..."
            value={searchText}
            onChangeText={onSearchChange}
            placeholderTextColor={PREMIUM_THEME.colors.neutral[400]}
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="filter" 
              size={20} 
              color={showFilters ? PREMIUM_THEME.colors.primary[500] : PREMIUM_THEME.colors.neutral[400]} 
            />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Compteur de résultats */}
      <Text style={styles.resultsCounter}>
        {filteredItems} opération{filteredItems > 1 ? 's' : ''} trouvée{filteredItems > 1 ? 's' : ''}
        {searchText || selectedFilter !== 'all' ? ` sur ${totalItems}` : ''}
      </Text>

      {/* Filtres */}
      {showFilters && (
        <Animated.View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.key && styles.filterChipActive
                  ]}
                  onPress={() => onFilterChange(filter.key)}
                >
                  <Ionicons 
                    name={filter.icon as any} 
                    size={16} 
                    color={selectedFilter === filter.key ? 'white' : PREMIUM_THEME.colors.neutral[600]} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    selectedFilter === filter.key && styles.filterChipTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

// 💫 Composant Timeline Item Premium
const TimelineItemCard = ({ item, onPress }: { item: TimelineItem; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = OPERATION_CONFIG[item.type];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.timelineCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.timelineGradient}
        >
          {/* Icône avec gradient */}
          <LinearGradient
            colors={config.gradient}
            style={styles.timelineIcon}
          >
            <Ionicons name={config.icon as any} size={24} color="white" />
          </LinearGradient>

          {/* Contenu principal */}
          <View style={styles.timelineContent}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>{config.label}</Text>
              <Text style={styles.timelineDate}>{formatDateSmart(item.date)}</Text>
            </View>

            <Text style={[styles.timelineAmount, { color: config.color }]}>
              {formatMoney(item.amount)}
            </Text>

            {/* Détails spécifiques */}
            <Text style={styles.timelineDetails}>
              {item.type === 'emprunt' && `Statut: ${item.data.statut || 'En cours'}`}
              {item.type === 'remboursement' && `Capital: ${formatMoney(item.data.montant_capital, true)}`}
              {item.type === 'solidarite' && `Session: ${item.data.session_nom || 'N/A'}`}
              {item.type === 'renflouement' && `Cause: ${item.data.cause || 'N/A'}`}
            </Text>
          </View>

          {/* Flèche */}
          <View style={styles.timelineArrow}>
            <Ionicons name="chevron-forward" size={20} color={PREMIUM_THEME.colors.neutral[400]} />
          </View>

          {/* Badge de statut */}
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: config.color }]}>
                {item.status}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🌟 Bottom Sheet Premium avec BottomSheet library
const PremiumBottomSheet = ({ item, onClose }: { item: TimelineItem | null; onClose: () => void }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  useEffect(() => {
    if (item) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [item]);

  if (!item) return null;

  const config = OPERATION_CONFIG[item.type];

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity 
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.bottomSheetContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
            style={styles.bottomSheetContent}
          >
            {/* Handle */}
            <View style={styles.bottomSheetHandle} />

            {/* Header */}
            <View style={styles.bottomSheetHeader}>
              <LinearGradient
                colors={config.gradient}
                style={styles.bottomSheetIcon}
              >
                <Ionicons name={config.icon as any} size={32} color="white" />
              </LinearGradient>
              <View style={styles.bottomSheetTitleContainer}>
                <Text style={styles.bottomSheetTitle}>{config.label}</Text>
                <Text style={styles.bottomSheetSubtitle}>
                  {formatDateSmart(item.date)} • {item.date.slice(11, 16)}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={PREMIUM_THEME.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            {/* Montant principal */}
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Montant</Text>
              <Text style={[styles.amountValue, { color: config.color }]}>
                {formatMoney(item.amount)}
              </Text>
            </View>

            {/* Détails spécifiques par type */}
            <ScrollView style={styles.detailsSection}>
              {item.type === 'emprunt' && (
                <>
                  <DetailRow label="Montant emprunté" value={formatMoney(item.data.montant_emprunte)} />
                  <DetailRow label="Total à rembourser" value={formatMoney(item.data.montant_total_a_rembourser)} />
                  <DetailRow label="Statut" value={item.data.statut || 'En cours'} />
                  <DetailRow label="Session" value={item.data.session_nom || 'N/A'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}

              {item.type === 'remboursement' && (
                <>
                  <DetailRow label="Capital remboursé" value={formatMoney(item.data.montant_capital)} />
                  <DetailRow label="Intérêts payés" value={formatMoney(item.data.montant_interet)} />
                  <DetailRow label="Session" value={item.data.session_nom || 'N/A'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}

              {item.type === 'solidarite' && (
                <>
                  <DetailRow label="Montant payé" value={formatMoney(item.data.montant)} />
                  <DetailRow label="Session" value={item.data.session_nom || 'N/A'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}

              {item.type === 'renflouement' && (
                <>
                  <DetailRow label="Montant payé" value={formatMoney(item.data.montant)} />
                  <DetailRow label="Cause" value={item.data.cause || 'N/A'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}

              {item.type === 'epargne' && (
                <>
                  <DetailRow label="Montant" value={formatMoney(item.data.montant)} />
                  <DetailRow label="Type" value={item.data.type || 'Dépôt'} />
                  <DetailRow label="Intérêts" value={formatMoney(item.data.montant_interet || 0)} />
                  <DetailRow label="Session" value={item.data.session_nom || 'N/A'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}

              {item.type === 'assistance' && (
                <>
                  <DetailRow label="Montant" value={formatMoney(item.data.montant)} />
                  <DetailRow label="Type" value={item.data.type_assistance || 'N/A'} />
                  <DetailRow label="Statut" value={item.data.statut || 'N/A'} />
                  <DetailRow label="Session" value={item.data.session_nom || 'N/A'} />
                  <DetailRow label="Justification" value={item.data.justification || 'Aucune'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}

              {item.type === 'paiement-inscription' && (
                <>
                  <DetailRow label="Montant" value={formatMoney(item.data.montant)} />
                  <DetailRow label="Session" value={item.data.session_nom || 'N/A'} />
                  <DetailRow label="Notes" value={item.data.notes || 'Aucune note'} />
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// 📋 Composant ligne de détail
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// � Fonction d'export PDF - Historique complet par session
const generateHistoryPDF = async (
  member: any,
  user: any,
  timeline: TimelineItem[],
  loansRaw: any,
  repaymentsRaw: any,
  solidarityRaw: any,
  renflouementRaw: any,
  savingsRaw: any,
  assistancesRaw: any,
  inscriptionPaymentsRaw: any
) => {
  try {
    // Grouper les transactions par session
    const transactionsBySession: { [key: string]: TimelineItem[] } = {};
    const sessionNames: { [key: string]: string } = {};

    timeline.forEach((item) => {
      const sessionName = item.data?.session_nom || "Sans session";
      if (!transactionsBySession[sessionName]) {
        transactionsBySession[sessionName] = [];
      }
      transactionsBySession[sessionName].push(item);
      sessionNames[sessionName] = sessionName;
    });

    // Fonction pour formater les montants
    const formatCurrency = (amount: number | string | undefined): string => {
      if (!amount) return "0 FCFA";
      const num = typeof amount === "string" ? parseFloat(amount) : amount;
      return `${num.toLocaleString("fr-FR")} FCFA`;
    };

    // Fonction pour obtenir les détails de la transaction
    const getTransactionDetails = (item: TimelineItem): string => {
      const config = OPERATION_CONFIG[item.type];
      const baseInfo = `
        <tr>
          <td>${new Date(item.date).toLocaleDateString("fr-FR")}</td>
          <td>${config.label}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td>${item.data?.session_nom || "N/A"}</td>
        </tr>
      `;
      return baseInfo;
    };

    // Construire le contenu HTML
    let transactionsHtml = "";
    Object.keys(transactionsBySession)
      .sort()
      .reverse()
      .forEach((sessionName) => {
        const items = transactionsBySession[sessionName];
        const sessionTotal = items.reduce((sum, item) => sum + item.amount, 0);

        transactionsHtml += `
          <div class="session-section">
            <h3 class="session-title">${sessionName}</h3>
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type d'opération</th>
                  <th>Montant</th>
                  <th>Session</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item) => getTransactionDetails(item)).join("")}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="text-align: right; font-weight: bold;">Total Session:</td>
                  <td style="font-weight: bold;">${formatCurrency(sessionTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
      });

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Historique Financier - ${member?.numero_membre}</title>
          <style>
            body { 
              font-family: 'Calibri', 'Arial', sans-serif; 
              margin: 20px;
              color: #333;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #2563EB; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .title { 
              color: #2563EB; 
              font-size: 28px; 
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle { 
              color: #666; 
              font-size: 14px;
              margin: 5px 0;
            }
            .member-info {
              background-color: #F8FAFC;
              border-left: 4px solid #2563EB;
              padding: 15px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .member-info-row {
              display: flex;
              margin: 8px 0;
            }
            .member-info-label {
              font-weight: bold;
              width: 150px;
              color: #2563EB;
            }
            .member-info-value {
              flex: 1;
            }
            .summary-section {
              background-color: #EFF6FF;
              border: 1px solid #BFDBFE;
              padding: 15px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .summary-grid {
              display: flex;
              gap: 20px;
              flex-wrap: wrap;
            }
            .summary-item {
              flex: 1;
              min-width: 200px;
            }
            .summary-label {
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            }
            .summary-value {
              color: #2563EB;
              font-size: 20px;
              font-weight: bold;
              margin-top: 5px;
            }
            .session-section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .session-title {
              color: #2563EB;
              font-size: 16px;
              font-weight: bold;
              border-bottom: 2px solid #BFDBFE;
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .transactions-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .transactions-table thead {
              background-color: #2563EB;
              color: white;
            }
            .transactions-table th {
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            .transactions-table td {
              padding: 10px 12px;
              border: 1px solid #E5E7EB;
            }
            .transactions-table tbody tr:nth-child(even) {
              background-color: #F8FAFC;
            }
            .transactions-table tfoot {
              background-color: #EFF6FF;
              font-weight: bold;
            }
            .transactions-table tfoot td {
              border-top: 2px solid #2563EB;
              padding: 12px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">HISTORIQUE FINANCIER DÉTAILLÉ</div>
            <div class="subtitle">Mutuelle des Enseignants - ENSP Yaoundé</div>
            <div class="subtitle">Membre: ${member?.numero_membre}</div>
          </div>

          <div class="member-info">
            <div class="member-info-row">
              <span class="member-info-label">Nom:</span>
              <span class="member-info-value">${member?.utilisateur?.nom_complet || "N/A"}</span>
            </div>
            <div class="member-info-row">
              <span class="member-info-label">Email:</span>
              <span class="member-info-value">${member?.utilisateur?.email || "N/A"}</span>
            </div>
            <div class="member-info-row">
              <span class="member-info-label">Numéro de membre:</span>
              <span class="member-info-value">${member?.numero_membre || "N/A"}</span>
            </div>
            <div class="member-info-row">
              <span class="member-info-label">Statut:</span>
              <span class="member-info-value">${member?.statut || "N/A"}</span>
            </div>
            <div class="member-info-row">
              <span class="member-info-label">Membre depuis:</span>
              <span class="member-info-value">${new Date(member?.date_inscription).toLocaleDateString("fr-FR") || "N/A"}</span>
            </div>
          </div>

          <div class="summary-section">
            <h3 style="margin: 0 0 15px 0; color: #2563EB;">RÉSUMÉ FINANCIER</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Patrimoine</div>
                <div class="summary-value">${formatCurrency(member?.donnees_financieres?.resume_financier?.patrimoine_total)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Obligations</div>
                <div class="summary-value">${formatCurrency(member?.donnees_financieres?.resume_financier?.obligations_totales)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Situation Nette</div>
                <div class="summary-value" style="color: ${member?.donnees_financieres?.resume_financier?.situation_nette >= 0 ? '#10B981' : '#EF4444'}">${formatCurrency(member?.donnees_financieres?.resume_financier?.situation_nette)}</div>
              </div>
            </div>
          </div>

          <h2 style="color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 10px; margin-bottom: 20px;">
            DÉTAIL DES TRANSACTIONS PAR SESSION
          </h2>

          ${transactionsHtml}

          <div class="footer">
            <p>Historique généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
            <p>Ce document est confidentiel et réservé au membre.</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Historique_${member?.numero_membre}_${new Date().toISOString().slice(0, 10)}.pdf`,
    });

    Alert.alert("Succès", "Historique exporté avec succès !");
  } catch (error) {
    console.error("Erreur export:", error);
    Alert.alert("Erreur", "Impossible d'exporter l'historique");
  }
};

// 📱 Composant principal
export default function MemberHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  
  // Data hooks
  const { data: member, isLoading: loadingMember, error: errorMember, refetch } = useMemberDetailByUser(user?.id);
  const { data: loansRaw, isLoading: loadingLoans } = useLoans({ membre: member?.id });
  const { data: repaymentsRaw, isLoading: loadingRepayments } = useRepayments({ membre: member?.id });
  const { data: solidarityRaw, isLoading: loadingSolidarity } = useSolidarityPayments({ membre: member?.id });
  const { data: renflouementRaw, isLoading: loadingRenfl } = useRenflouements({ membre: member?.id });
  const { data: savingsRaw, isLoading: loadingSavings } = useSavings({ membre: member?.id });
  const { data: assistancesRaw, isLoading: loadingAssistances } = useAssistancesByMember(member?.id || "");
  const { data: inscriptionPaymentsRaw, isLoading: loadingInscriptionPayments } = useInscriptionPayments();

  // États locaux
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  // Normalisation et création de la timeline
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    // Emprunts
    const loans = Array.isArray(loansRaw) ? loansRaw : (loansRaw?.results ?? []);
    const loanIds = new Set(loans.map((loan: any) => loan.id)); // Créer un set des IDs d'emprunts du membre
    
    loans.forEach((loan: any) => {
      items.push({
        id: `loan-${loan.id}`,
        type: "emprunt",
        date: loan.date_emprunt,
        amount: loan.montant_emprunte,
        data: loan,
        status: loan.statut,
      });
    });

    // Remboursements - Filtrer pour ne garder que ceux liés aux emprunts du membre
    const repayments = Array.isArray(repaymentsRaw) ? repaymentsRaw : (repaymentsRaw?.results ?? []);
    repayments.forEach((rep: any) => {
      // Vérifier que le remboursement correspond à un emprunt du membre connecté
      if (loanIds.has(rep.emprunt)) {
        items.push({
          id: `repayment-${rep.id}`,
          type: "remboursement",
          date: rep.date_remboursement,
          amount: rep.montant,
          data: rep,
        });
      }
    });

    // Solidarités
    const solidarites = Array.isArray(solidarityRaw) ? solidarityRaw : (solidarityRaw?.results ?? []);
    solidarites.forEach((sol: any) => {
      items.push({
        id: `solidarity-${sol.id}`,
        type: "solidarite",
        date: sol.date_paiement,
        amount: sol.montant,
        data: sol,
      });
    });

    // Renflouements
    const renflouements = Array.isArray(renflouementRaw) ? renflouementRaw : (renflouementRaw?.results ?? []);
    renflouements.forEach((renf: any) => {
      (renf.paiements_details || []).forEach((pay: any) => {
        items.push({
          id: `renflouement-${pay.id}`,
          type: "renflouement",
          date: pay.date_paiement,
          amount: pay.montant,
          data: { ...pay, cause: renf.cause },
        });
      });
    });

    // Épargnes
    const savings = Array.isArray(savingsRaw) ? savingsRaw : (savingsRaw?.results ?? []);
    savings.forEach((saving: any) => {
      items.push({
        id: `saving-${saving.id}`,
        type: "epargne",
        date: saving.date_transaction || saving.date_creation,
        amount: saving.montant,
        data: saving,
        status: saving.type || "Dépôt",
      });
    });

    // Assistances
    const assistances = Array.isArray(assistancesRaw) ? assistancesRaw : (assistancesRaw?.assistances ?? []);
    assistances.forEach((assistance: any) => {
      items.push({
        id: `assistance-${assistance.id}`,
        type: "assistance",
        date: assistance.date_paiement || assistance.date_demande,
        amount: assistance.montant,
        data: assistance,
        status: assistance.statut,
      });
    });

    // Paiements d'Inscription
    const inscriptionPayments = Array.isArray(inscriptionPaymentsRaw) ? inscriptionPaymentsRaw : (inscriptionPaymentsRaw?.results ?? []);
    // Filtrer pour obtenir uniquement les paiements du membre connecté
    const memberInscriptionPayments = inscriptionPayments.filter((payment: any) => payment.membre === member?.id);
    memberInscriptionPayments.forEach((payment: any) => {
      items.push({
        id: `inscription-${payment.id}`,
        type: "paiement-inscription",
        date: payment.date_paiement,
        amount: parseFloat(payment.montant),
        data: payment,
      });
    });

    // Tri par date décroissante
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loansRaw, repaymentsRaw, renflouementRaw, solidarityRaw, savingsRaw, assistancesRaw, inscriptionPaymentsRaw, member?.id]);

  // Filtrage et recherche
  const filteredTimeline = useMemo(() => {
    let filtered = timeline;

    // Filtre par type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => item.type === selectedFilter);
    }

    // Recherche textuelle
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const config = OPERATION_CONFIG[item.type];
        const amount = formatMoney(item.amount).toLowerCase();
        const date = formatDateSmart(item.date).toLowerCase();
        
        return (
          config.label.toLowerCase().includes(search) ||
          amount.includes(search) ||
          date.includes(search) ||
          (item.data.notes && item.data.notes.toLowerCase().includes(search))
        );
      });
    }

    return filtered;
  }, [timeline, selectedFilter, searchText]);

  // 🎯 Pagination
  const paginatedTimeline = useMemo(() => {
    return filteredTimeline.slice(0, displayedItems);
  }, [filteredTimeline, displayedItems]);

  const hasMore = displayedItems < filteredTimeline.length;

  const loadMore = () => {
    setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, filteredTimeline.length));
  };

  // Reset pagination when search or filter changes
  useMemo(() => {
    setDisplayedItems(ITEMS_PER_PAGE);
  }, [searchText, selectedFilter]);

  if (loadingMember || loadingLoans || loadingRepayments || loadingSolidarity || loadingRenfl || loadingSavings || loadingAssistances || loadingInscriptionPayments) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={PREMIUM_THEME.gradients.primary}
          style={styles.loadingGradient}
        >
          <Animated.View style={styles.loadingContent}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
              style={styles.loadingIcon}
            >
              <Ionicons name="analytics" size={48} color="white" />
            </LinearGradient>
            <Text style={styles.loadingText}>Chargement de votre historique...</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  if (errorMember || !member) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={[PREMIUM_THEME.colors.error[50], '#FFFFFF']}
          style={styles.errorGradient}
        >
          <Ionicons name="alert-circle" size={64} color={PREMIUM_THEME.colors.error[500]} />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>
            Impossible de récupérer vos données.
          </Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <LinearGradient
              colors={PREMIUM_THEME.gradients.primary}
              style={styles.retryGradient}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.retryText}>Réessayer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <LinearGradient
        colors={PREMIUM_THEME.gradients.primary}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>📊 Historique Détaillé</Text>
            <Text style={styles.headerSubtitle}>
              Toutes vos opérations financières
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={async () => {
              setExporting(true);
              try {
                await generateHistoryPDF(
                  member,
                  user,
                  timeline,
                  loansRaw,
                  repaymentsRaw,
                  solidarityRaw,
                  renflouementRaw,
                  savingsRaw,
                  assistancesRaw,
                  inscriptionPaymentsRaw
                );
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Résumé financier */}
        <FinancialSummaryCard member={member} />

        {/* Recherche et filtres */}
        <SearchAndFilters
          searchText={searchText}
          onSearchChange={setSearchText}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          totalItems={timeline.length}
          filteredItems={filteredTimeline.length}
        />

        {/* Timeline */}
        <View style={styles.timelineSection}>
          {filteredTimeline.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={PREMIUM_THEME.gradients.glass}
                style={styles.emptyStateCard}
              >
                <Ionicons name="document-text-outline" size={64} color={PREMIUM_THEME.colors.neutral[400]} />
                <Text style={styles.emptyTitle}>
                  {searchText || selectedFilter !== 'all' ? 'Aucun résultat' : 'Aucune opération'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchText || selectedFilter !== 'all' 
                    ? 'Essayez de modifier vos critères de recherche'
                    : 'Vos transactions apparaîtront ici'
                  }
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <>
              <FlatList
                data={paginatedTimeline}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <TimelineItemCard
                    item={item}
                    onPress={() => setSelectedItem(item)}
                  />
                )}
                scrollEnabled={false}
                contentContainerStyle={styles.timelineList}
                ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
              />

              {/* Bouton "Voir plus" */}
              {hasMore && (
                <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                  <LinearGradient
                    colors={PREMIUM_THEME.gradients.primary}
                    style={styles.loadMoreGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="arrow-down" size={20} color="white" />
                    <Text style={styles.loadMoreText}>
                      Voir plus ({filteredTimeline.length - displayedItems} restant{filteredTimeline.length - displayedItems > 1 ? 's' : ''})
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Espacement pour tab bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Sheet */}
      <PremiumBottomSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },

  // Loading
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  loadingText: {
    fontSize: FONT_SIZES.lg,
    color: 'white',
    fontWeight: '600',
  },

  // Error
  errorContainer: {
    flex: 1,
  },
  errorGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: PREMIUM_THEME.colors.error[600],
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[600],
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  retryText: {
    marginLeft: SPACING.sm,
    color: 'white',
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: 'white',
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  exportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Summary Card
  summaryCard: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: PREMIUM_THEME.colors.neutral[800],
  },
  summaryMetrics: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: PREMIUM_THEME.colors.neutral[600],
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  summaryNetRow: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  summaryNetLabel: {
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[700],
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  summaryNetValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    marginBottom: SPACING.lg,
  },
  searchBar: {
    marginBottom: SPACING.sm,
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[800],
  },
  filterButton: {
    padding: SPACING.xs,
  },
  resultsCounter: {
    fontSize: FONT_SIZES.sm,
    color: PREMIUM_THEME.colors.neutral[600],
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  filtersContainer: {
    marginTop: SPACING.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: PREMIUM_THEME.colors.neutral[200],
  },
  filterChipActive: {
    backgroundColor: PREMIUM_THEME.colors.primary[500],
    borderColor: PREMIUM_THEME.colors.primary[500],
  },
  filterChipText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: PREMIUM_THEME.colors.neutral[600],
  },
  filterChipTextActive: {
    color: 'white',
  },

  // Timeline
  timelineSection: {
    marginBottom: SPACING.lg,
  },
  timelineList: {
    paddingBottom: SPACING.md,
  },
  timelineCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  timelineGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  timelineTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: PREMIUM_THEME.colors.neutral[800],
  },
  timelineDate: {
    fontSize: FONT_SIZES.sm,
    color: PREMIUM_THEME.colors.neutral[500],
    fontWeight: '500',
  },
  timelineAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  timelineDetails: {
    fontSize: FONT_SIZES.sm,
    color: PREMIUM_THEME.colors.neutral[600],
  },
  timelineArrow: {
    marginLeft: SPACING.sm,
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    marginVertical: SPACING.xl,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: PREMIUM_THEME.colors.neutral[600],
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal & Bottom Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheetContainer: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  bottomSheetContent: {
    padding: SPACING.lg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: PREMIUM_THEME.colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  bottomSheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  bottomSheetTitleContainer: {
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: PREMIUM_THEME.colors.neutral[800],
  },
  bottomSheetSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: PREMIUM_THEME.colors.neutral[600],
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  amountSection: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[600],
    marginBottom: SPACING.xs,
  },
  amountValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
  },
  detailsSection: {
    maxHeight: 300,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[600],
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    color: PREMIUM_THEME.colors.neutral[800],
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },

  // Load More Button
  loadMoreButton: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: PREMIUM_THEME.colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: 'white',
  },

  // Bottom spacing
  bottomSpacing: {
    height: 100,
  },
});