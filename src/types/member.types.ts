import { User } from './user.types';

export type MemberStatus = 'EN_REGLE' | 'NON_EN_REGLE' | 'SUSPENDU';

export interface Member {
  id: string;
  utilisateur: User;
  numero_membre: string;
  date_inscription: string;
  statut: MemberStatus;
  exercice_inscription: string;
  exercice_inscription_nom: string;
  session_inscription: string;
  session_inscription_nom: string;
  is_en_regle: boolean;
  donnees_financieres: MemberFinancialData;
  date_creation: string;
  date_modification: string;
}

// Données financières ultra détaillées
export interface MemberFinancialData {
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