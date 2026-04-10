// Types pour les transactions d'inscription et caisse d'inscription

export interface MouvementCaisse {
  id: string;
  type_mouvement: "ENTREE" | "SORTIE";
  montant: string;
  description: string;
  date_mouvement: string;
  caisse_inscription: string;
}

export interface CaisseInscription {
  id: string;
  exercice: string;
  exercice_nom: string;
  montant_total: string;
  mouvements_recents: MouvementCaisse[];
  date_creation: string;
  date_modification: string;
}
