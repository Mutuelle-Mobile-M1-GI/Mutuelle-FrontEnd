export type WithdrawalStatus = 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';

export interface WithdrawalTransaction {
  id: string;
  membre: string;
  membre_info: {
    id: string;
    numero_membre: string;
    nom: string;
  };
  session: string;
  session_nom: string;
  montant: string | number;
  statut: WithdrawalStatus;
  statut_display: string;
  motif?: string;
  notes_admin?: string;
  date_demande: string;
  date_traitement?: string | null;
  epargne_disponible: number;
  epargne_transaction?: string | null;
  epargne_transaction_info?: {
    id: string;
    montant: number;
    date: string;
  };
}

export interface WithdrawalCreatePayload {
  membre: string;
  session: string;
  montant: number;
  motif?: string;
  notes_admin?: string;
}
