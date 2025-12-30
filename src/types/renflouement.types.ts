export type RenflouementCauseType = 'ASSISTANCE' | 'COLLATION' | 'AUTRE';

export interface Renflouement {
  id: string;
  membre: string;
  membre_info: {
    id: string;
    numero_membre: string;
    nom_complet: string;
    email: string;
    statut: string;
  };
  session: string;
  session_nom: string;
  montant_du: number;
  montant_paye: number;
  montant_restant: number;
  is_solde: boolean;
  pourcentage_paye: number;
  cause: string;
  type_cause: RenflouementCauseType;
  type_cause_display: string;
  date_creation: string;
  date_derniere_modification: string;
  paiements_details: RenflouementPayment[];
}

export interface RenflouementPayment {
  id: string;
  renflouement: string;
  renflouement_info: {
    id: string;
    membre_numero: string;
    membre_nom: string;
    montant_total_du: number;
    cause: string;
  };
  montant: number;
  session: string;
  session_nom: string;
  date_paiement: string;
  notes: string;
}