export interface DashboardData {
    fonds_social: {
      montant_total: number;
      exercice: string;
      derniere_modification: string;
    };
    tresor: {
      cumul_total_epargnes: number;
      nombre_membres: number;
    };
    emprunts_en_cours: {
      nombre: number;
      montant_total_attendu: number;
    };
    situation_globale: {
      liquidites_totales: number;
      engagements_totaux: number;
    };
    derniers_paiements: {
      inscriptions: any[];
      solidarites: any[];
      remboursements: any[];
    };
    alertes: {
      type: string;
      message: string;
      priorite: string;
      membre_id?: string;
      emprunt_id?: string;
    }[];
    activite_recente: {
      nouveaux_membres: number;
      nouveaux_emprunts: number;
      assistances_demandees: number;
      total_paiements: number;
    };
    membres_problematiques: any[];

    renflouements?: {
      montants: {
        total_du: number;
        total_paye: number;
      };
      pourcentages: {
        taux_recouvrement: number;
      };
    };
  }