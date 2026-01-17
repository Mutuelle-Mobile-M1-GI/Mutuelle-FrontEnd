export type SessionStatus = 'EN_COURS' | 'TERMINEE';

export interface Session {
  id: string;
  exercice: string;
  exercice_nom: string;
  nom: string;
  date_session: string;
  montant_collation: number;
  statut: SessionStatus;
  description: string;
  is_en_cours: boolean;
  nombre_membres_inscrits: number;
  total_solidarite_collectee: number;
  renflouements_generes: number;
  date_creation: string;
  date_modification: string;
}