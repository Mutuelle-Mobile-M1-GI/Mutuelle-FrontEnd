export type SavingTransactionType = 'DEPOT' | 'RETRAIT_PRET' | 'INTERET';

export interface SavingTransaction {
  id: string;
  membre: string;
  membre_info: {
    id: string;
    numero_membre: string;
    nom_complet: string;
    email: string;
    statut: string;
  };
  type_transaction: SavingTransactionType;
  type_transaction_display: string;
  montant: number;
  session: string;
  session_nom: string;
  date_transaction: string;
  notes: string;
}