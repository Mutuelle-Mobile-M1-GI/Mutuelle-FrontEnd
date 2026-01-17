import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthContext } from "../../context/AuthContext";
import { useCurrentUser, useUpdateProfile, useChangePassword } from "../../hooks/useAuth";
import { getStoredAccessToken } from "../../services/auth.service";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user: loggedUser, logout } = useAuthContext();

  // React Query hooks (logique inchangée)
  const { data: user, refetch: refetchUser, isLoading: loadingUser } = useCurrentUser();

  // États profil (logique inchangée)
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    telephone: user?.telephone || "",
    email: user?.email || "",
  });

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        telephone: user.telephone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const [saving, setSaving] = useState(false);

  // États modal mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Hooks mutations (logique inchangée)
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // Logique métier (inchangée)
  const isAdmin = !!user?.is_administrateur;
  const isMembre = !isAdmin && !!user?.is_membre;

  const handleSave = async () => {
    setSaving(true);
    try {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) throw new Error("Token introuvable");
      await updateProfile.mutateAsync({ updates: profile, accessToken });
      await refetchUser();
      Alert.alert("Succès", "Profil mis à jour !");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de mettre à jour le profil");
    }
    setSaving(false);
  };

  const handlePwdChange = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires.");
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert("Erreur", "Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setPwdLoading(true);
    try {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) throw new Error("Token introuvable");
      await changePassword.mutateAsync({
        old_password: currentPwd,
        new_password: newPwd,
        new_password_confirm: confirmPwd,
        accessToken,
      });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setShowPasswordModal(false);
      Alert.alert("Succès", "Mot de passe modifié !");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de changer le mot de passe");
    }
    setPwdLoading(false);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  // Avatar et infos (logique inchangée)
  const initials = ((profile.first_name || "")[0] || "") + ((profile.last_name || "")[0] || "");
  const userName = user?.nom_complet || (user?.first_name + " " + user?.last_name) || user?.username || "";

  if (loadingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Header moderne */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonContainer}>
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Mon Profil</Text>
          
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              
              {/* Section Avatar Ultra Moderne */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarBackground}>
                    <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
                  </View>
                  
                  {/* Cercles décoratifs */}
                  <View style={[styles.decorativeRing, styles.ring1]} />
                  <View style={[styles.decorativeRing, styles.ring2]} />
                </View>
                
                <Text style={styles.userName}>{userName}</Text>
                
                <View style={styles.roleContainer}>
                  <View style={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.memberBadge]}>
                    <Ionicons 
                      name={isAdmin ? "shield-checkmark" : "person"} 
                      size={14} 
                      color={COLORS.primary} 
                    />
                    <Text style={styles.roleText}>
                      {isAdmin ? "Administrateur" : "Membre"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card principal */}
              <View style={styles.mainCard}>
                {/* Section Informations */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconContainer}>
                      <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Informations personnelles</Text>
                  </View>

                  {/* Prénom */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Prénom</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={profile.first_name}
                        onChangeText={t => setProfile(p => ({ ...p, first_name: t }))}
                        placeholder="Prénom"
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Nom */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nom</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={profile.last_name}
                        onChangeText={t => setProfile(p => ({ ...p, last_name: t }))}
                        placeholder="Nom"
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Téléphone (membre uniquement) */}
                  {isMembre && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Téléphone</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={profile.telephone}
                          onChangeText={t => setProfile(p => ({ ...p, telephone: t }))}
                          placeholder="Téléphone"
                          placeholderTextColor={COLORS.textLight}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  )}

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>E-mail</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={profile.email}
                        onChangeText={t => setProfile(p => ({ ...p, email: t }))}
                        placeholder="E-mail"
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  {/* Bouton Enregistrer */}
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator color={COLORS.background} size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
                        <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Section Sécurité */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconContainer}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Sécurité</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.securityItem}
                    onPress={() => setShowPasswordModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.securityItemLeft}>
                      <View style={styles.securityIcon}>
                        <Ionicons name="key-outline" size={18} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text style={styles.securityItemTitle}>Changer mon mot de passe</Text>
                        <Text style={styles.securityItemSubtitle}>Modifier votre mot de passe actuel</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Modal Changement de Mot de Passe */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalContainer}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalBackButton}
              onPress={closePasswordModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Changer le mot de passe</Text>
            
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <View style={styles.modalInfo}>
                <View style={styles.modalInfoIcon}>
                  <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.modalInfoText}>
                  Votre nouveau mot de passe doit être sécurisé et différent de l'ancien.
                </Text>
              </View>

              {/* Mot de passe actuel */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de passe actuel</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={currentPwd}
                    onChangeText={setCurrentPwd}
                    placeholder="Saisissez votre mot de passe actuel"
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Nouveau mot de passe */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nouveau mot de passe</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPwd}
                    onChangeText={setNewPwd}
                    placeholder="Nouveau mot de passe"
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Confirmer mot de passe */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPwd}
                    onChangeText={setConfirmPwd}
                    placeholder="Confirmez le nouveau mot de passe"
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Boutons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closePasswordModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveButton, pwdLoading && styles.saveButtonDisabled]}
                  onPress={handlePwdChange}
                  disabled={pwdLoading}
                  activeOpacity={0.8}
                >
                  {pwdLoading ? (
                    <ActivityIndicator color={COLORS.background} size="small" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color={COLORS.background} />
                      <Text style={styles.modalSaveText}>Changer </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.background,
    letterSpacing: 2,
  },
  decorativeRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 60,
    borderColor: `${COLORS.primary}20`,
  },
  ring1: {
    width: 120,
    height: 120,
    top: -10,
    left: -10,
  },
  ring2: {
    width: 140,
    height: 140,
    top: -20,
    left: -20,
    borderColor: `${COLORS.primary}10`,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  roleContainer: {
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  adminBadge: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  memberBadge: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  roleText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 4,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    marginTop: SPACING.lg,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  saveButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.md,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  securityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  securityItemSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: SPACING.xl,
    gap: 12,
  },
  modalInfoIcon: {
    marginTop: 2,
  },
  modalInfoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.xl,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  modalSaveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    gap: 8,
  },
  modalSaveText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.md,
  },
});