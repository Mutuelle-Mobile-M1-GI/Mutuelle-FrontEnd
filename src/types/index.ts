// Types TypeScript pour l'application Mutuelle ENSPY
// Basés sur les modèles du backend Django

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telephone: string;
  role: 'MEMBRE' | 'ADMINISTRATEUR';
  photo_profil?: string;
  photo_profil_url?: string;
  nom_complet: string;
  is_membre: boolean;
  is_administrateur: boolean;
  date_creation: string;
  date_modification: string;
  is_active: boolean;
}

export interface Member {
  id: string;
  utilisateur: User;
  numero_membre: string;
  date_inscription: string;
  statut: 'EN_REGLE' | 'NON_EN_REGLE' | 'SUSPENDU';
  exercice_inscription: string;
  exercice_inscription_nom: string;
  session_inscription: string;
  session_inscription_nom: string;
  is_en_regle: boolean;
  donnees_financieres: MemberFinancialData;
}

export interface MemberFinancialData {
  membre_info: {
    id: string;
    numero_membre: string;
    nom_complet: string;
    email: string;
    telephone: string;
    photo_profil_url?: string;
    date_inscription: string;
    statut: string;
    en_regle: boolean;
  };
  inscription: {
    montant_total_inscription: number;
    montant_paye_inscription: number;
    montant_restant_inscription: number;
    inscription_complete: boolean;
    pourcentage_inscription: number;
  };
  solidarite: {
    montant_solidarite_session_courante: number;
    montant_paye_session_courante: number;
    montant_restant_session_courante: number;
    solidarite_session_courante_complete: boolean;
    total_solidarite_due: number;
    total_solidarite_payee: number;
    dette_solidarite_cumul: number;
    solidarite_a_jour: boolean;
  };
  epargne: {
    epargne_base: number;
    retraits_pour_prets: number;
    interets_recus: number;
    retours_remboursements: number;
    epargne_totale: number;
    epargne_plus_interets: number;
    montant_interets_separe: number;
  };
  emprunt: {
    a_emprunt_en_cours: boolean;
    montant_emprunt_en_cours: number;
    montant_total_a_rembourser: number;
    montant_deja_rembourse: number;
    montant_restant_a_rembourser: number;
    pourcentage_rembourse: number;
    montant_max_empruntable: number;
    nombre_emprunts_total: number;
  };
  renflouement: {
    total_renflouement_du: number;
    total_renflouement_paye: number;
    solde_renflouement_du: number;
    renflouement_a_jour: boolean;
    nombre_renflouements: number;
  };
  resume_financier: {
    patrimoine_total: number;
    obligations_totales: number;
    situation_nette: number;
  };
}

export interface Loan {
  id: string;
  membre: string;
  membre_info: any;
  montant_emprunte: number;
  taux_interet: number;
  montant_total_a_rembourser: number;
  montant_rembourse: number;
  montant_restant_a_rembourser: number;
  montant_interets: number;
  pourcentage_rembourse: number;
  session_emprunt: string;
  session_nom: string;
  date_emprunt: string;
  statut: 'EN_COURS' | 'REMBOURSE' | 'EN_RETARD';
  statut_display: string;
  notes: string;
  remboursements_details: any[];
}

export interface Transaction {
  id: string;
  type: 'INSCRIPTION' | 'SOLIDARITE' | 'EPARGNE' | 'EMPRUNT' | 'REMBOURSEMENT' | 'ASSISTANCE' | 'RENFLOUEMENT';
  montant: number;
  date: string;
  description: string;
  statut?: string;
}

export interface DashboardData {
  fonds_social: {
    montant_total: number;
    exercice: string;
    derniere_modification: string;
  };
  tresor: {
    cumul_total_epargnes: number;
    nombre_membres: number;
  };
  emprunts_en_cours: {
    nombre: number;
    montant_total_attendu: number;
  };
  situation_globale: {
    liquidites_totales: number;
    engagements_totaux: number;
  };
  derniers_paiements: any;
  alertes: Alert[];
  activite_recente: any;
  membres_problematiques: any[];
}

export interface Alert {
  type: 'RETARD_RENFLOUEMENT' | 'EMPRUNT_RETARD' | 'FONDS_FAIBLE';
  message: string;
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  membre_id?: string;
  emprunt_id?: string;
}

export interface Session {
  id: string;
  nom: string;
  date_session: string;
  montant_collation: number;
  statut: 'EN_COURS' | 'TERMINEE';
}

export interface Exercise {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  statut: 'EN_COURS' | 'TERMINE';
}

export interface Configuration {
  id: string;
  montant_inscription: number;
  montant_solidarite: number;
  taux_interet: number;
  coefficient_emprunt_max: number;
  duree_exercice_mois: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface TransactionModalData {
  type: 'INSCRIPTION' | 'SOLIDARITE' | 'EPARGNE' | 'EMPRUNT' | 'REMBOURSEMENT';
  member: Member;
  maxAmount?: number;
  defaultAmount?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type NavigationParamList = {
  Login: undefined;
  Pin: { action: 'setup' | 'verify' };
  AdminDashboard: undefined;
  MemberDashboard: undefined;
  Members: undefined;
  Reports: undefined;
  Refunds: undefined;
  Settings: undefined;
  Profile: undefined;
  Notifications: undefined;
  Chatbot: undefined;
  History: undefined;
};


