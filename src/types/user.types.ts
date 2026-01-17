export type UserRole = 'MEMBRE' | 'ADMINISTRATEUR';

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
  is_administrateur: boolean;
  date_creation: string;
  date_modification: string;
  is_active: boolean;
}