import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "../../constants/config";
import { useMembers, useMemberFinance } from "../../hooks/useMember";
import { useCreateFullMember, useAddInscriptionPayment } from "../../hooks/useMember";
import { useCurrentSession } from "../../hooks/useSession";
import { Member, MemberFinancialData } from "../../types/member.types";
import { Image } from "react-native"; // ✅ AJOUTER cette ligne
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// 🎯 Composants de cartes financières
interface FinancialCardProps {
  title: string;
  icon: string;
  value: string;
  subtitle?: string;
  color: string;
  progress?: number;
  trend?: "up" | "down" | "stable";
}

const FinancialCard = ({ title, icon, value, subtitle, color, progress, trend }: FinancialCardProps) => (
  <View style={[styles.financialCard, { borderLeftColor: color }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={[styles.cardValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      {trend && (
        <Ionicons 
          name={trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "remove"} 
          size={16} 
          color={trend === "up" ? COLORS.success : trend === "down" ? COLORS.error : COLORS.textSecondary} 
        />
      )}
    </View>
    {progress !== undefined && (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
      </View>
    )}
  </View>
);

// 🎯 Composant membre avec statut visuel
interface MemberCardProps {
  member: Member;
  onPress: () => void;
  onPayment: () => void;
  onDetail: () => void;
}

const MemberCard = ({ member, onPress, onPayment, onDetail }: MemberCardProps) => {
  const isComplete = member.donnees_financieres?.inscription?.inscription_complete;
  const progress = member.donnees_financieres?.inscription?.pourcentage_inscription || 0;
  
  const getStatusColor = () => {
    switch (member.statut) {
      case "EN_REGLE": return COLORS.success;
      case "NON_EN_REGLE": return COLORS.warning;
      case "SUSPENDU": return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (member.statut) {
      case "EN_REGLE": return "checkmark-circle";
      case "NON_EN_REGLE": return "warning";
      case "SUSPENDU": return "ban";
      default: return "help-circle";
    }
  };

  return (
    <TouchableOpacity style={styles.memberCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.memberCardContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {member.utilisateur.photo_profil_url ? (
            <Image source={{ uri: member.utilisateur.photo_profil_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: getStatusColor() + "20" }]}>
              <Text style={[styles.avatarText, { color: getStatusColor() }]}>
                {member.utilisateur.first_name?.[0]}{member.utilisateur.last_name?.[0]}
              </Text>
            </View>
          )}
          {/* Indicateur de statut */}
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
            <Ionicons name={getStatusIcon() as any} size={12} color="white" />
          </View>
        </View>

        {/* Informations principales */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.utilisateur.nom_complet}</Text>
          <Text style={styles.memberNumber}>{member.numero_membre}</Text>
          <Text style={styles.memberEmail}>{member.utilisateur.email}</Text>
          
          {/* Barre de progression inscription */}
          <View style={styles.inscriptionProgress}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Inscription</Text>
              <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { 
                width: `${progress}%`, 
                backgroundColor: isComplete ? COLORS.success : COLORS.primary 
              }]} />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.memberActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onDetail}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton,
              styles.paymentButton,
              isComplete && styles.disabledButton
            ]} 
            onPress={onPayment}
            disabled={isComplete}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isComplete ? "checkmark-circle" : "card-outline"} 
              size={18} 
              color={isComplete ? COLORS.success : "white"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// 🎯 Modal de détail membre ultra-complet
interface MemberDetailModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
  financialData: MemberFinancialData | null;
  loading: boolean;
}

const MemberDetailModal = ({ visible, member, onClose, financialData, loading }: MemberDetailModalProps) => {
  if (!member) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <View style={styles.modalOverlay}>
        <View style={styles.detailModalContainer}>
          
          {/* Header du modal */}
          <LinearGradient
            colors={[COLORS.primary, "#3A86FF"]}
            style={styles.detailModalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.detailHeaderContent}>
              <View style={styles.detailAvatarContainer}>
                {member.utilisateur.photo_profil_url ? (
                  <Image source={{ uri: member.utilisateur.photo_profil_url }} style={styles.detailAvatar} />
                ) : (
                  <View style={styles.detailAvatarFallback}>
                    <Text style={styles.detailAvatarText}>
                      {member.utilisateur.first_name?.[0]}{member.utilisateur.last_name?.[0]}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.detailMemberInfo}>
                <Text style={styles.detailMemberName}>{member.utilisateur.nom_complet}</Text>
                <Text style={styles.detailMemberNumber}>{member.numero_membre}</Text>
                <View style={styles.detailStatusBadge}>
                  <Text style={styles.detailStatusText}>{member.statut}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Contenu du modal */}
          <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement des données...</Text>
              </View>
            ) : financialData ? (
              <>
                {/* Informations personnelles */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="person" size={16} color={COLORS.primary} /> Informations personnelles
                  </Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{member.utilisateur.email}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Téléphone</Text>
                      <Text style={styles.infoValue}>{member.utilisateur.telephone}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Date d'inscription</Text>
                      <Text style={styles.infoValue}>
                        {new Date(member.date_inscription).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Session d'inscription</Text>
                      <Text style={styles.infoValue}>{member.session_inscription_nom}</Text>
                    </View>
                  </View>
                </View>

                {/* Résumé financier ultra-complet */}
<View style={styles.sectionContainer}>
  <Text style={styles.sectionTitle}>
    <Ionicons name="pie-chart" size={16} color={COLORS.primary} /> Résumé financier complet
  </Text>
  
  {/* Vue d'ensemble */}
  <View style={styles.summaryContainer}>
    <View style={[styles.summaryCard, { backgroundColor: COLORS.success + "15" }]}>
      <Ionicons name="trending-up" size={20} color={COLORS.success} />
      <Text style={styles.summaryLabel}>Patrimoine</Text>
      <Text style={[styles.summaryValue, { color: COLORS.success }]}>
        {formatCurrency(financialData.resume_financier.patrimoine_total)}
      </Text>
    </View>
    <View style={[styles.summaryCard, { backgroundColor: COLORS.error + "15" }]}>
      <Ionicons name="trending-down" size={20} color={COLORS.error} />
      <Text style={styles.summaryLabel}>Obligations</Text>
      <Text style={[styles.summaryValue, { color: COLORS.error }]}>
        {formatCurrency(financialData.resume_financier.obligations_totales)}
      </Text>
    </View>
    <View style={[styles.summaryCard, { 
      backgroundColor: financialData.resume_financier.situation_nette >= 0 ? COLORS.success + "15" : COLORS.error + "15" 
    }]}>
      <Ionicons 
        name={financialData.resume_financier.situation_nette >= 0 ? "checkmark-circle" : "alert-circle"} 
        size={20} 
        color={financialData.resume_financier.situation_nette >= 0 ? COLORS.success : COLORS.error} 
      />
      <Text style={styles.summaryLabel}>Situation</Text>
      <Text style={[styles.summaryValue, { 
        color: financialData.resume_financier.situation_nette >= 0 ? COLORS.success : COLORS.error 
      }]}>
        {formatCurrency(financialData.resume_financier.situation_nette)}
      </Text>
    </View>
  </View>

  {/* Détails par catégorie */}
  <View style={styles.detailsGrid}>
    
    {/* Inscription détaillée */}
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <Ionicons name="card" size={16} color={COLORS.primary} />
        <Text style={styles.detailTitle}>Inscription</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total requis</Text>
        <Text style={styles.detailValue}>{formatCurrency(financialData.inscription.montant_total_inscription)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Payé</Text>
        <Text style={[styles.detailValue, { color: COLORS.success }]}>
          {formatCurrency(financialData.inscription.montant_paye_inscription)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Restant</Text>
        <Text style={[styles.detailValue, { color: COLORS.warning }]}>
          {formatCurrency(financialData.inscription.montant_restant_inscription)}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { 
            width: `${financialData.inscription.pourcentage_inscription}%`, 
            backgroundColor: financialData.inscription.inscription_complete ? COLORS.success : COLORS.warning 
          }]} />
        </View>
        <Text style={styles.progressText}>{financialData.inscription.pourcentage_inscription.toFixed(1)}%</Text>
      </View>
    </View>

    {/* Épargne détaillée */}
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <Ionicons name="wallet" size={16} color={COLORS.primary} />
        <Text style={styles.detailTitle}>Épargne</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Base</Text>
        <Text style={styles.detailValue}>{formatCurrency(financialData.epargne.epargne_base)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Intérêts reçus</Text>
        <Text style={[styles.detailValue, { color: COLORS.success }]}>
          {formatCurrency(financialData.epargne.interets_recus)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Retraits pour prêts</Text>
        <Text style={[styles.detailValue, { color: COLORS.warning }]}>
          {formatCurrency(financialData.epargne.retraits_pour_prets)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { fontWeight: "bold" }]}>Total épargne</Text>
        <Text style={[styles.detailValue, { fontWeight: "bold", color: COLORS.primary }]}>
          {formatCurrency(financialData.epargne.epargne_totale)}
        </Text>
      </View>
    </View>

    {/* Emprunt (si applicable) */}
    {(financialData.emprunt.a_emprunt_en_cours || financialData.emprunt.nombre_emprunts_total > 0) && (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Ionicons name="trending-down" size={16} color={COLORS.error} />
          <Text style={styles.detailTitle}>Emprunts</Text>
          {financialData.emprunt.a_emprunt_en_cours && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIF</Text>
            </View>
          )}
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nombre total</Text>
          <Text style={styles.detailValue}>{financialData.emprunt.nombre_emprunts_total}</Text>
        </View>
        {financialData.emprunt.a_emprunt_en_cours && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>En cours</Text>
              <Text style={[styles.detailValue, { color: COLORS.error }]}>
                {formatCurrency(financialData.emprunt.montant_emprunt_en_cours)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Déjà remboursé</Text>
              <Text style={[styles.detailValue, { color: COLORS.success }]}>
                {formatCurrency(financialData.emprunt.montant_deja_rembourse)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Restant à payer</Text>
              <Text style={[styles.detailValue, { color: COLORS.error, fontWeight: "bold" }]}>
                {formatCurrency(financialData.emprunt.montant_restant_a_rembourser)}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { 
                  width: `${financialData.emprunt.pourcentage_rembourse}%`, 
                  backgroundColor: COLORS.success 
                }]} />
              </View>
              <Text style={styles.progressText}>{financialData.emprunt.pourcentage_rembourse}% remboursé</Text>
            </View>
          </>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Max empruntable</Text>
          <Text style={[styles.detailValue, { color: COLORS.primary }]}>
            {formatCurrency(financialData.emprunt.montant_max_empruntable)}
          </Text>
        </View>
      </View>
    )}

    {/* Renflouement (si applicable) */}
    {(financialData.renflouement.nombre_renflouements > 0 || financialData.renflouement.solde_renflouement_du > 0) && (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Ionicons name="refresh-circle" size={16} color={COLORS.warning} />
          <Text style={styles.detailTitle}>Renflouements</Text>
          {!financialData.renflouement.renflouement_a_jour && (
            <View style={[styles.activeBadge, { backgroundColor: COLORS.warning }]}>
              <Text style={styles.activeBadgeText}>DÛ</Text>
            </View>
          )}
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nombre total</Text>
          <Text style={styles.detailValue}>{financialData.renflouement.nombre_renflouements}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total dû</Text>
          <Text style={styles.detailValue}>{formatCurrency(financialData.renflouement.total_renflouement_du)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total payé</Text>
          <Text style={[styles.detailValue, { color: COLORS.success }]}>
            {formatCurrency(financialData.renflouement.total_renflouement_paye)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontWeight: "bold" }]}>Solde restant</Text>
          <Text style={[styles.detailValue, { 
            fontWeight: "bold", 
            color: financialData.renflouement.solde_renflouement_du > 0 ? COLORS.error : COLORS.success 
          }]}>
            {formatCurrency(financialData.renflouement.solde_renflouement_du)}
          </Text>
        </View>
      </View>
    )}

    {/* Solidarité détaillée */}
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <Ionicons name="heart" size={16} color={COLORS.primary} />
        <Text style={styles.detailTitle}>Solidarité</Text>
        {financialData.solidarite.solidarite_a_jour && (
          <View style={[styles.activeBadge, { backgroundColor: COLORS.success }]}>
            <Text style={styles.activeBadgeText}>À JOUR</Text>
          </View>
        )}
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Session actuelle</Text>
        <Text style={styles.detailValue}>
          {formatCurrency(financialData.solidarite.montant_paye_session_courante)} / {formatCurrency(financialData.solidarite.montant_solidarite_session_courante)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total payé</Text>
        <Text style={[styles.detailValue, { color: COLORS.success }]}>
          {formatCurrency(financialData.solidarite.total_solidarite_payee)}
        </Text>
      </View>
      {financialData.solidarite.dette_solidarite_cumul > 0 && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dette cumulée</Text>
          <Text style={[styles.detailValue, { color: COLORS.error }]}>
            {formatCurrency(financialData.solidarite.dette_solidarite_cumul)}
          </Text>
        </View>
      )}
    </View>
  </View>
</View>

              
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color={COLORS.error} />
                <Text style={styles.errorText}>Impossible de charger les données financières</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// 🎯 Modal d'ajout de membre avec sélecteur photo
interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}

const AddMemberModal = ({ visible, onClose, onSubmit, loading }: AddMemberModalProps) => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    telephone: "",
    montant_inscription_initial: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder aux photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!form.username || !form.email || !form.first_name || !form.last_name || !form.telephone) {
      Alert.alert("Erreur", "Tous les champs marqués * sont obligatoires.");
      return;
    }

    onSubmit({
      ...form,
      password: "000000",
      montant_inscription_initial: form.montant_inscription_initial ? Number(form.montant_inscription_initial) : 0,
      ...(photo ? { photo_profil: photo } : {}),
    });
  };

  const resetForm = () => {
    setForm({
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      telephone: "",
      montant_inscription_initial: "",
    });
    setPhoto(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      <View style={styles.modalOverlay}>
        <View style={styles.addModalContainer}>
          
          {/* Header */}
          <LinearGradient
            colors={[COLORS.success, "#57CC99"]}
            style={styles.addModalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.addHeaderContent}>
              <Ionicons name="person-add" size={24} color="white" />
              <Text style={styles.addModalTitle}>Nouveau membre</Text>
              <TouchableOpacity onPress={() => { onClose(); resetForm(); }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Formulaire */}
          <ScrollView style={styles.addModalBody} showsVerticalScrollIndicator={false}>
            
            {/* Sélecteur de photo */}
            <View style={styles.photoSection}>
              <Text style={styles.photoLabel}>Photo de profil (optionnel)</Text>
              <TouchableOpacity style={styles.photoSelector} onPress={pickImage}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.selectedPhoto} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={32} color={COLORS.textLight} />
                    <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Champs du formulaire */}
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom d'utilisateur *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.username}
                  onChangeText={(text) => setForm({ ...form, username: text })}
                  placeholder="Ex: fox123"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.sm }]}>
                  <Text style={styles.inputLabel}>Prénom *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.first_name}
                    onChangeText={(text) => setForm({ ...form, first_name: text })}
                    placeholder="Prénom"
                    editable={!loading}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.sm }]}>
                  <Text style={styles.inputLabel}>Nom *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.last_name}
                    onChangeText={(text) => setForm({ ...form, last_name: text })}
                    placeholder="Nom"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  placeholder="exemple@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Téléphone *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.telephone}
                  onChangeText={(text) => setForm({ ...form, telephone: text })}
                  placeholder="+237 6XX XXX XXX"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Montant inscription initial (FCFA)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.montant_inscription_initial}
                  onChangeText={(text) => setForm({ ...form, montant_inscription_initial: text })}
                  placeholder="0"
                  keyboardType="numeric"
                  editable={!loading}
                />
                <Text style={styles.helperText}>
                  Laisser vide pour un paiement ultérieur
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.addModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { onClose(); resetForm(); }}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? [COLORS.textLight, COLORS.textLight] : [COLORS.success, "#57CC99"]}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.submitButtonText}>Créer le membre</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 🎯 Composant principal
export default function InscriptionsScreen() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const navigation = useNavigation();


  // API hooks
  const { data: membersRaw, isLoading, refetch } = useMembers();
  const { data: session } = useCurrentSession();
  const createMember = useCreateFullMember();
  const addPayment = useAddInscriptionPayment();

  // Détail membre
  const { data: memberFinance, isLoading: loadingDetail } = useMemberFinance(selectedMember?.id || "");

  // Liste membres
  const members: Member[] = Array.isArray(membersRaw) ? membersRaw : [];

  // Filtrage et stats
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchStr = `${member.utilisateur.first_name} ${member.utilisateur.last_name} ${member.utilisateur.email} ${member.numero_membre}`.toLowerCase();
      return searchStr.includes(search.toLowerCase());
    });
  }, [members, search]);

  const stats = useMemo(() => {
    return {
      total: members.length,
      enRegle: members.filter(m => m.statut === "EN_REGLE").length,
      inscriptionsCompletes: members.filter(m => m.donnees_financieres?.inscription?.inscription_complete).length,
      totalInscriptions: members.reduce((sum, m) => sum + (m.donnees_financieres?.inscription?.montant_paye_inscription || 0), 0),
    };
  }, [members]);

  // Handlers
  const handleAddMember = (data: any) => {
    createMember.mutate(data, {
      onSuccess: () => {
        setShowAddModal(false);
        refetch();
        Alert.alert("Succès", "Membre ajouté avec succès !");
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.error || "Impossible d'ajouter le membre";
        Alert.alert("Erreur", errorMessage);
      }
    });
  };

  const handleAddPayment = () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      Alert.alert("Erreur", "Montant invalide.");
      return;
    }
    if (!selectedMember) return;

    const restant = selectedMember.donnees_financieres?.inscription?.montant_restant_inscription || 0;
    const amount = Number(paymentAmount);

    if (amount > restant) {
      Alert.alert(
        "Attention", 
        `Le montant saisi (${amount.toLocaleString()} FCFA) dépasse le restant à payer (${restant.toLocaleString()} FCFA). Voulez-vous continuer ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Continuer", onPress: submitPayment }
        ]
      );
    } else {
      submitPayment();
    }
  };

  const submitPayment = () => {
    if (!selectedMember) return;
    
    addPayment.mutate({
      membre_id: selectedMember.id,
      montant: Number(paymentAmount),
      notes: paymentNotes,
    }, {
      onSuccess: () => {
        setShowPaymentModal(false);
        setPaymentAmount("");
        setPaymentNotes("");
        setSelectedMember(null);
        refetch();
        Alert.alert("Succès", "Paiement ajouté avec succès !");
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.error || "Impossible d'ajouter le paiement";
        Alert.alert("Erreur", errorMessage);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      
      {/* Header avec stats */}
      <LinearGradient
        colors={[COLORS.primary, "#3A86FF"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* ✅ AJOUTER le bouton back */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Gestion des Inscriptions</Text>
            <Text style={styles.headerSubtitle}>Membres et paiements d'inscription</Text>
          </View>
        </View>
        
        
        {/* Stats rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Membres</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.enRegle}</Text>
            <Text style={styles.statLabel}>En règle</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.inscriptionsCompletes}</Text>
            <Text style={styles.statLabel}>Complètes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(stats.totalInscriptions / 1000000).toFixed(1)}M</Text>
            <Text style={styles.statLabel}>Total FCFA</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Barre de recherche et bouton d'ajout */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
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
        
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <LinearGradient
            colors={[COLORS.success, "#57CC99"]}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Liste des membres */}
      <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement des membres...</Text>
          </View>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onPress={() => {
                setSelectedMember(member);
                setShowDetailModal(true);
              }}
              onPayment={() => {
                setSelectedMember(member);
                setShowPaymentModal(true);
              }}
              onDetail={() => {
                setSelectedMember(member);
                setShowDetailModal(true);
              }}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucun membre trouvé</Text>
            <Text style={styles.emptyText}>
              {search ? "Aucun résultat pour votre recherche" : "Commencez par ajouter des membres"}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
                <Text style={styles.emptyButtonText}>Ajouter un membre</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <AddMemberModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        loading={createMember.isPending}
      />

      <MemberDetailModal
        visible={showDetailModal}
        member={selectedMember}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMember(null);
        }}
        financialData={memberFinance}
        loading={loadingDetail}
      />

      {/* Modal de paiement */}
      <Modal visible={showPaymentModal} transparent animationType="fade" statusBarTranslucent>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContainer}>
            
            {/* Header */}
            <LinearGradient
              colors={[COLORS.warning, "#FCBF49"]}
              style={styles.paymentModalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.paymentHeaderContent}>
                <Ionicons name="card" size={24} color="white" />
                <Text style={styles.paymentModalTitle}>Paiement d'inscription</Text>
                <TouchableOpacity onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedMember(null);
                  setPaymentAmount("");
                  setPaymentNotes("");
                }}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Contenu */}
            <View style={styles.paymentModalBody}>
              {selectedMember && (
                <>
                  {/* Info membre */}
                  <View style={styles.memberInfoSection}>
                    <Text style={styles.memberInfoTitle}>Membre sélectionné</Text>
                    <View style={styles.memberInfoCard}>
                      <View style={styles.memberInfoLeft}>
                        <Text style={styles.memberInfoName}>{selectedMember.utilisateur.nom_complet}</Text>
                        <Text style={styles.memberInfoNumber}>{selectedMember.numero_membre}</Text>
                      </View>
                      <View style={styles.memberInfoRight}>
                        <Text style={styles.memberInfoLabel}>Restant à payer</Text>
                        <Text style={styles.memberInfoAmount}>
                          {formatCurrency(selectedMember.donnees_financieres?.inscription?.montant_restant_inscription || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Formulaire de paiement */}
                  <View style={styles.paymentFormSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Montant du paiement (FCFA) *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        placeholder="Montant en FCFA"
                        keyboardType="numeric"
                        editable={!addPayment.isPending}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                      <TextInput
                        style={[styles.textInput, styles.notesInput]}
                        value={paymentNotes}
                        onChangeText={setPaymentNotes}
                        placeholder="Notes sur le paiement..."
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        editable={!addPayment.isPending}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Actions */}
            <View style={styles.paymentModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedMember(null);
                  setPaymentAmount("");
                  setPaymentNotes("");
                }}
                disabled={addPayment.isPending}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, addPayment.isPending && styles.submitButtonDisabled]}
                onPress={handleAddPayment}
                disabled={addPayment.isPending}
              >
                <LinearGradient
                  colors={addPayment.isPending ? [COLORS.textLight, COLORS.textLight] : [COLORS.warning, "#FCBF49"]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {addPayment.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.submitButtonText}>Valider le paiement</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header avec stats
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255,255,255,0.8)",
    marginTop: SPACING.xs,
  },

  // Recherche
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  searchInputContainer: {
    flex: 1,
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
  addButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    marginBottom:12,
  },
  addButtonGradient: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  // Liste des membres
  membersList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowLight,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
  },

  // Avatar
  avatarContainer: {
    position: "relative",
    marginRight: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  // Info membre
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
    color: COLORS.primary,
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },
  memberEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  // Progression inscription
  inscriptionProgress: {
    marginTop: SPACING.xs,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  progressPercent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },

  // Actions membre
  memberActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.success + "20",
    borderColor: COLORS.success,
  },

  // États
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyButtonText: {
    color: "white",
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },

  // Modals base
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },

  // Modal de détail
  detailModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: width - SPACING.lg * 2,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  detailModalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  detailHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailAvatarContainer: {
    marginRight: SPACING.md,
  },
  detailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "white",
  },
  detailAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  detailAvatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: "white",
  },
  detailMemberInfo: {
    flex: 1,
  },
  detailMemberName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
    marginBottom: SPACING.xs,
  },
  detailMemberNumber: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255,255,255,0.8)",
    marginBottom: SPACING.xs,
  },
  detailStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  detailStatusText: {
    fontSize: FONT_SIZES.sm,
    color: "white",
    fontWeight: "500",
  },
  closeButton: {
    padding: SPACING.xs,
  },
  detailModalBody: {
    maxHeight: 500,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Sections du modal de détail
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  infoItem: {
    flex: 1,
    minWidth: "45%",
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: "500",
  },

  // Cartes financières
  financialCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },
  cardValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    marginTop: SPACING.md,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: SPACING.xs,
  },

  // Résumé financier
  summaryContainer: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom:15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
  },

  // Error state
  errorContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    textAlign: "center",
    marginTop: SPACING.md,
  },

  // Modal d'ajout
  addModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: width - SPACING.lg * 2,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  addModalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  addHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  addModalBody: {
    maxHeight: 500,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Section photo
  photoSection: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  photoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: "500",
    marginBottom: SPACING.md,
  },
  photoSelector: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  selectedPhoto: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },

  // Formulaire
  formSection: {
    gap: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: "500",
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: "italic",
    marginBottom: 15,

  },

  // Actions des modals
  addModalActions: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentModalActions: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom:10,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: "white",
  },

  // Modal de paiement
  paymentModalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: width - SPACING.lg * 2,
    maxHeight: "80%",
    overflow: "hidden",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  paymentModalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  paymentHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  paymentModalBody: {
    padding: SPACING.lg,
  },

  // Info membre dans modal paiement
  memberInfoSection: {
    marginBottom: SPACING.lg,
  },
  memberInfoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  memberInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberInfoLeft: {
    flex: 1,
  },
  memberInfoName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  memberInfoNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "500",
  },
  memberInfoRight: {
    alignItems: "flex-end",
  },
  memberInfoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  memberInfoAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.warning,
  },

  // Section formulaire paiement
  paymentFormSection: {
    gap: SPACING.md,
  },
// ajout pour resume financier

  detailsGrid: {
    gap: SPACING.md,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  detailTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  activeBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: "white",
    fontWeight: "bold",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
    textAlign: "right",
  },
});