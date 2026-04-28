export type UserRole = 'MEMBRE' | 'SECRETAIRE_GENERALE' | 'TRESORIER' | 'PRESIDENT';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telephone: string;
  role: UserRole;
  photo_profil: string | null;
  photo_profil_url: string | null;
  nom_complet: string;
  is_membre: boolean;
  is_administrateur: boolean;        // compatibilité — même valeur que is_secretaire_generale
  is_secretaire_generale: boolean;
  is_tresorier: boolean;
  is_president: boolean;
  is_bureau: boolean;
  can_write: boolean;
  date_creation: string;
  date_modification: string;
  is_active: boolean;
}
