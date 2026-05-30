export type WithdrawalStatus = 'APPROUVE' | 'REJETE';

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
  motif?: string;
  notes_admin?: string;
  date_retrait: string;
  epargne_disponible: number;
  epargne_transaction: string;
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
}

export interface SavingsAvailable {
  membre_id: string;
  numero_membre: string;
  epargne_disponible: number;
}
