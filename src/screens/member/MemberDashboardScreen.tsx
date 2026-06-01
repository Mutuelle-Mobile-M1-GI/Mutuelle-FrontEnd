import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../constants/config";
import { useMemberDetail, useMemberDetailByUser } from "../../hooks/useMember";
import { useCurrentUser } from "../../hooks/useAuth";
import { useMutuelleConfig } from "../../hooks/useConfig";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { useCurrentExercise, useCurrentSession } from "../../hooks/useExercise";
import { toNumber } from "lodash";
import NotificationButton from "../../components/NotificationButton";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🎨 Thème Bleu/Blanc élégant
const BLUE_THEME = {
  primary: '#2563EB',
  secondary: '#1D4ED8',
  light: '#EFF6FF',
  gradient: ['#3B82F6', '#2563EB'],
  gradientLight: ['#F8FAFC', '#F1F5F9'],
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  accent: '#8B5CF6',
};

// 💰 Formatage des montants
const formatMoney = (amount: number, showCurrency = true) => {
  if (!amount  || isNaN(amount)) return "0";
  const formatted = amount.toLocaleString('fr-FR');
  return showCurrency ? `${formatted} FCFA` : formatted;
};

// 📅 Formatage des dates
const formatDate = (dateStr: string) => {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return "--";
  }
};

// 🏷️ Composant Badge de statut du membre
const MemberStatusBadge = ({ status }: { status: 'EN_REGLE' | 'NON_EN_REGLE' | 'SUSPENDU' | 'NON_DEFINI' }) => {
  const getConfig = () => {
    switch (status) {
      case 'EN_REGLE':
        return { 
          color: BLUE_THEME.success, 
          icon: 'shield-checkmark', 
          text: 'En Règle', 
          bg: '#ECFDF5' 
        };
      case 'NON_EN_REGLE':
        return { 
          color: BLUE_THEME.error, 
          icon: 'alert-circle', 
          text: 'Non en Règle', 
          bg: '#FEF2F2' 
        };
      case 'SUSPENDU':
        return { 
          color: BLUE_THEME.warning, 
          icon: 'pause-circle', 
          text: 'Suspendu', 
          bg: '#FFFBEB' 
        };
      case 'NON_DEFINI':
      default:
        return { 
          color: COLORS.textSecondary, 
          icon: 'help-circle', 
          text: 'Non Défini', 
          bg: '#F3F4F6' 
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon as any} size={16} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// 🏷️ Composant Badge de statut
const StatusBadge = ({ status, type }: { status: boolean; type: 'inscription' | 'solidarite' | 'global' }) => {
  const getConfig = () => {
    switch (type) {
      case 'inscription':
        return status 
          ? { color: BLUE_THEME.success, icon: 'checkmark-circle', text: 'Réglée', bg: '#ECFDF5' }
          : { color: BLUE_THEME.error, icon: 'alert-circle', text: 'En cours', bg: '#FEF2F2' };
      case 'solidarite':
        return status 
          ? { color: BLUE_THEME.success, icon: 'checkmark-circle', text: 'À jour', bg: '#ECFDF5' }
          : { color: BLUE_THEME.warning, icon: 'time', text: 'En retard', bg: '#FFFBEB' };
      case 'global':
        return status 
          ? { color: BLUE_THEME.success, icon: 'shield-checkmark', text: 'En règle', bg: '#ECFDF5' }
          : { color: BLUE_THEME.error, icon: 'warning', text: 'Non en règle', bg: '#FEF2F2' };
      default:
        return { color: COLORS.textLight, icon: 'help', text: 'Inconnu', bg: '#F3F4F6' };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon as any} size={16} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// 💳 Composant Carte financière
const FinancialCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = BLUE_THEME.primary,
  progress,
  onPress,
  style 
}: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity 
        style={styles.financialCard}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FEFEFE']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          
          <Text style={[styles.cardValue, { color }]}>{value}</Text>
          
          {subtitle && (
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          )}
          
          {progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(progress, 100)}%`, backgroundColor: color }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🎯 Composant d'action rapide
const QuickActionCard = ({ title, subtitle, icon, color, onPress }: any) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.8}>
    <LinearGradient
      colors={[color + '10', color + '05']}
      style={styles.quickActionGradient}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    </LinearGradient>
  </TouchableOpacity>
);

// 📊 Composant résumé financier
const FinancialSummary = ({ member }: any) => {
  const resume = member?.donnees_financieres?.resume_financier || {};
  
  const patrimoine = resume.patrimoine_total || 0;
  const obligationsReelles = resume.obligations_totales || 0;
  const situationNette = resume.situation_nette || 0;

  // 1. On force l'affichage à 0 si c'est négatif
  const obligationsAffichees = Math.max(0, obligationsReelles);
  
  // 2. On calcule l'excédent (si les obligations sont < 0)
  const excedent = obligationsReelles < 0 ? Math.abs(obligationsReelles) : 0;

  return (
    <View style={styles.summaryContainer}>
      <LinearGradient colors={BLUE_THEME.gradient} style={styles.summaryGradient}>
        <Text style={styles.summaryTitle}>Résumé Financier</Text>
        
        <View style={styles.summaryGrid}>
          {/* Patrimoine */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Patrimoine</Text>
            <Text style={styles.summaryValue}>{formatMoney(Math.abs(patrimoine), false)}</Text>
          </View>
          
          {/* Obligations avec message d'excédent */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Obligations</Text>
            <Text style={styles.summaryValue}>{formatMoney(obligationsAffichees, false)}</Text>
            
            {/* Message conditionnel si excédent */}
            {excedent > 0 && (
              <Text style={styles.excedentText}>
                (Excédent de {formatMoney(excedent, true)})
              </Text>
            )}
          </View>
          
          {/* Situation Nette */}
          <View style={[styles.summaryItem, styles.summaryItemFull]}>
            <Text style={styles.summaryLabel}>Situation Nette</Text>
            <Text style={[
              styles.summaryValue, 
              styles.summaryValueLarge,
              { color: situationNette >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {formatMoney(Math.abs(situationNette), false)} FCFA
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// 📱 Composant principal
export default function MemberDashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: member, isLoading, error, refetch } = useMemberDetailByUser(user?.id);
  const { data: config } = useMutuelleConfig();
  const { data: session } = useCurrentSession();
  const { data: exercise } = useCurrentExercise();

  const [refreshing, setRefreshing] = useState(false);

  // Gestion du refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      // ✅ AJOUTER ces lignes pour refresh les données utilisateur
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["current-exercise"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    } finally {
      setRefreshing(false);
    }
  };

  // Navigation vers profil
  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  // Navigation vers notifications
  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  // Navigation vers historique
  const handleHistoryPress = () => {
    navigation.navigate('Historique' as never);
  };

  if (isLoading || userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={BLUE_THEME.gradientLight}
          style={styles.loadingGradient}
        >
          <Animated.View style={styles.loadingContent}>
            <Ionicons name="wallet" size={48} color={BLUE_THEME.primary} />
            <Text style={styles.loadingText}>Chargement de votre tableau de bord...</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={['#FEF2F2', '#FFFFFF']}
          style={styles.errorGradient}
        >
          <Ionicons name="alert-circle" size={64} color={BLUE_THEME.error} />
          <Text style={styles.errorTitle}>Oups ! Une erreur s'est produite</Text>
          <Text style={styles.errorText}>
            {error?.message || 'Impossible de charger vos informations financières.'}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              queryClient.invalidateQueries({ queryKey: ["member-by-user"] });
              refetch();
            }} 
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // Calculs pour l'affichage
  const userName = user?.nom_complet || user?.first_name || user?.email || "Membre";
  const firstName = userName.split(' ')[0] || "Membre";
  
  const inscriptionProgress = member.donnees_financieres?.inscription.pourcentage_inscription;
  const solidarityProgress= (toNumber(member.donnees_financieres?.solidarite.montant_paye_session_courante)|0)*100/(toNumber(config?.montant_solidarite)|0);
  const epargneTotal = member.donnees_financieres?.epargne.bilan_epargne;
  const interets = member.donnees_financieres?.epargne.montant_interets_separe;
  const maxEmpruntable = member.donnees_financieres?.emprunt.montant_max_empruntable;
  const empruntEnCours = member.donnees_financieres?.emprunt.a_emprunt_en_cours;
  const montantEmprunt = member.donnees_financieres?.emprunt.montant_restant_a_rembourser;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header avec gradient */}
      <LinearGradient
        colors={BLUE_THEME.gradient}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {/* Top Header */}
          <View style={styles.headerTop}>
            {/* Salutation */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Bonjour,</Text>
              <Text style={styles.userName}>{firstName} 👋</Text>
            </View>
            
            {/* Actions */}
            <View style={styles.headerActions}>
              <NotificationButton />
              
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={handleProfilePress}
              >
                <Ionicons name="person-circle" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Statut global */}
          <View style={styles.globalStatus}>
            <MemberStatusBadge status={member.statut} />
            <Text style={styles.memberNumber}>Na° {member.numero_membre}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Contenu principal */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[BLUE_THEME.primary]}
            tintColor={BLUE_THEME.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Résumé financier */}
        <FinancialSummary member={member} config={config} />

        {/* Cartes principales */}
        <View style={styles.cardsGrid}>
          {/* Épargne */}
          <FinancialCard
            title="Épargne Totale"
            value={formatMoney(epargneTotal)}
            subtitle={`+ ${formatMoney(interets)} d'intérêts`}
            icon="wallet"
            color={BLUE_THEME.success}
            style={styles.cardLarge}
          />

          {/* Inscription */}
          <FinancialCard
            title="Inscription"
            value={formatMoney(member.donnees_financieres?.inscription.montant_paye_inscription)}
            subtitle={`sur ${formatMoney(member.donnees_financieres?.inscription.montant_total_inscription)}`}
            icon="school"
            color={member.donnees_financieres?.inscription.inscription_complete ? BLUE_THEME.success : BLUE_THEME.warning}
            progress={inscriptionProgress}
            style={styles.cardSmall}
          />

          {/* Solidarité */}
          <FinancialCard
            title="Solidarité"
            value={formatMoney(member.donnees_financieres?.solidarite.montant_paye_session_courante)}
            subtitle={`sur ${formatMoney(member.donnees_financieres?.solidarite.montant_solidarite_session_courante)}`}
            icon="people"
            color={member.donnees_financieres?.solidarite.solidarite_a_jour ? BLUE_THEME.success : BLUE_THEME.warning}
            style={styles.cardSmall}
            progress={solidarityProgress}
          />
        </View>

        {/* Potentiel d'emprunt */}
        <View style={styles.loanPotentialContainer}>
          <LinearGradient
            colors={['#F8FAFC', '#F1F5F9']}
            style={styles.loanPotentialGradient}
          >
            <View style={styles.loanPotentialHeader}>
              <Ionicons name="trending-up" size={24} color={BLUE_THEME.accent} />
              <Text style={styles.loanPotentialTitle}>Potentiel d'Emprunt</Text>
            </View>
            
            <Text style={styles.loanPotentialAmount}>
              {formatMoney(maxEmpruntable)}
            </Text>
            
            <Text style={styles.loanPotentialSubtitle}>
              Taux d'intérêt : {config?.taux_interet || 10}% • Coefficient : {config?.coefficient_emprunt_max || 5}x
            </Text>

            {empruntEnCours && (
              <View style={styles.currentLoanAlert}>
                <Ionicons name="information-circle" size={16} color={BLUE_THEME.warning} />
                <Text style={styles.currentLoanText}>
                  Emprunt en cours : {formatMoney(montantEmprunt)} à rembourser
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Actions rapides */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          
          <QuickActionCard
            title="Voir l'historique complet"
            subtitle="Tous vos mouvements financiers"
            icon="time"
            color={BLUE_THEME.primary}
            onPress={handleHistoryPress}
          />

          <QuickActionCard
            title="Contacter l'administration"
            subtitle="Support et assistance"
            icon="chatbubble-ellipses"
            color={BLUE_THEME.accent}
            // onPress={() => Alert.alert("Contact", "Fonctionnalité à implémenter")}
          />

          {!member.donnees_financieres?.inscription.inscription_complete && (
            <QuickActionCard
              title="Terminer mon inscription"
              subtitle={`Reste ${formatMoney(member.donnees_financieres?.inscription.montant_restant_inscription)}`}
              icon="warning"
              color={BLUE_THEME.warning}
              onPress={() => Alert.alert("Inscription", "Contactez l'administration pour compléter votre inscription")}
            />
          )}
        </View>

        {/* Informations contextuelles */}
        <View style={styles.contextInfo}>
          <Text style={styles.contextTitle}>Informations Contextuelles</Text>
          
          <View style={styles.contextGrid}>
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Session actuelle</Text>
              <Text style={styles.contextValue}>{session?.nom || "Non définie"}</Text>
            </View>
            
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Exercice</Text>
              <Text style={styles.contextValue}>{exercise?.nom || "Non défini"}</Text>
            </View>
            
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Membre depuis</Text>
              <Text style={styles.contextValue}>{formatDate(member.date_inscription)}</Text>
            </View>
            
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Nombre d'emprunts</Text>
              <Text style={styles.contextValue}>{member.donnees_financieres?.emprunt.nombre_emprunts_total}</Text>
            </View>
          </View>
        </View>

        {/* Espacement pour la tab bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: BLUE_THEME.primary,
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
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: BLUE_THEME.error,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE_THEME.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 3,
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
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
  headerContent: {
    paddingTop: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    color: 'white',
    fontWeight: '700',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: SPACING.md,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  globalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberNumber: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xl,
  },
  statusText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Summary
  summaryContainer: {
    marginBottom: SPACING.lg,
  },
  summaryGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: 'white',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryItemFull: {
    width: '100%',
    marginTop: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: 'white',
  },
  summaryValueLarge: {
    fontSize: FONT_SIZES.lg,
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    marginHorizontal: -SPACING.xs,
  },
  cardLarge: {
    width: '100%',
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
  },
  cardSmall: {
    width: `${(100 - 2 * SPACING.xs) / 2}%`,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
  },

  // Financial Card
  financialCard: {
    borderRadius: BORDER_RADIUS.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  cardValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginRight: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Loan Potential
  loanPotentialContainer: {
    marginBottom: SPACING.lg,
  },
  loanPotentialGradient: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loanPotentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  loanPotentialTitle: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  loanPotentialAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: BLUE_THEME.accent,
    marginBottom: SPACING.xs,
  },
  loanPotentialSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  currentLoanAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  currentLoanText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: BLUE_THEME.warning,
    fontWeight: '500',
  },

  // Quick Actions
  quickActionsContainer: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    // elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Context Info
  contextInfo: {
    marginBottom: SPACING.lg,
  },
  contextTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  contextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  contextItem: {
    width: '50%',
    paddingVertical: SPACING.sm,
  },
  contextLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  contextValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Bottom spacing
  bottomSpacing: {
    height: 100, // Pour la tab bar
  },
  excedentText: {
    fontSize: 10,
    color: '#A7F3D0', // Un vert très clair pour contraster avec le bleu
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
});