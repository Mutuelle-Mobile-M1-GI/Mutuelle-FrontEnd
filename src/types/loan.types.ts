export type LoanStatus = 'EN_COURS' | 'REMBOURSE' | 'EN_RETARD';

export interface Loan {
  id: string;
  membre: string;
  membre_info: {
    id: string;
    numero_membre: string;
    nom_complet: string;
    email: string;
    statut: string;
  };
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
  statut: LoanStatus;
  statut_display: string;
  notes: string;
  remboursements_details: Repayment[];
}

export interface Repayment {
  id: string;
  emprunt: string;
  emprunt_info: {
    id: string;
    membre_numero: string;
    membre_nom: string;
    montant_emprunte: number;
    montant_total_a_rembourser: number;
  };
  montant: number;
  montant_capital: number;
  montant_interet: number;
  session: string;
  session_nom: string;
  date_remboursement: string;
  notes: string;
}