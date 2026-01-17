export type AssistanceStatus = 'DEMANDEE' | 'APPROUVEE' | 'PAYEE' | 'REJETEE';

export interface Assistance {
  id: string;
  membre: string;
  membre_info: {
    id: string;
    numero_membre: string;
    nom_complet: string;
    email: string;
    statut: string;
  };
  type_assistance: string;
  type_assistance_info: {
    id: string;
    nom: string;
    montant: number;
    description: string;
    actif: boolean;
    date_creation: string;
    date_modification: string;
  };
  montant: number;
  session: string;
  session_nom: string;
  date_demande: string;
  date_paiement: string | null;
  statut: AssistanceStatus;
  statut_display: string;
  justification: string;
  notes: string;
}