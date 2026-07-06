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
  exercice_renflouement?: string | null;
  exercice_nom?: string | null;
  date_creation: string;
  date_derniere_modification: string;
  paiements_details: RenflouementPayment[];
}

export interface RenflouementPayment {
  id: string;
  renflouement: string;
  renflouement_info: {
    id: string;
    montant_du: number;
    montant_paye: number;
    montant_restant: number;
    type_cause: string;
    est_proportionnel: boolean;
  };
  membre_numero: string;
  membre_nom: string;
  montant: string;
  montant_caisse_inscription: string;
  montant_fonds_social: string;
  ratio_caisse_utilise: string;
  ratio_fonds_utilise: string;
  repartition_detail: {
    type: string;
    description: string;
    caisse_inscription: string;
    fonds_social: string;
    formule: string;
  };
  session: string;
  session_info: {
    id: string;
    exercice: string;
    exercice_nom: string;
    nom: string;
    date_session: string;
    montant_collation: string;
    montant_autre_depense: string;
    motif_autre_depense: string;
    statut: string;
    description: string;
    is_en_cours: boolean;
    nombre_membres_inscrits: number;
    total_solidarite_collectee: number;
    renflouements_generes: number;
    date_creation: string;
    date_modification: string;
  };
  date_paiement: string;
  notes: string;
}