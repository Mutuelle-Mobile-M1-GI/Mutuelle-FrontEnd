export type ExerciseStatus = 'EN_COURS' | 'TERMINEE';

export interface Exercise {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  statut: ExerciseStatus;
  description: string;
  is_en_cours: boolean;
  nombre_sessions: number;
  fonds_social_info: {
    montant_total: number;
    derniere_modification: string;
  };
  date_creation: string;
  date_modification: string;
}