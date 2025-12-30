export interface SolidarityPayment {
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
    montant: number;
    date_paiement: string;
    notes: string;
  }
  
  export interface SocialFund {
    id: string;
    exercice: string;
    exercice_nom: string;
    montant_total: number;
    mouvements_recents: SocialFundMovement[];
    date_creation: string;
    date_modification: string;
  }
  
  export interface SocialFundMovement {
    type_mouvement: 'ENTREE' | 'SORTIE';
    montant: number;
    description: string;
    date_mouvement: string;
  }