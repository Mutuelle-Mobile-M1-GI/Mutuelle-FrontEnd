// Point d'entrée centralisé pour toutes les URLs d'API

import { createLoan } from "../services/loan.service";

export const API_BASE_URL = "http://172.20.10.4:8000/api";

export const API_ENDPOINTS = {
  // Auth
  login: "/token/",
  refresh: "/token/refresh/",
  verify: "/token/verify/",
  me: "/auth/utilisateurs/me/",
  updateProfile: "/auth/utilisateurs/update_profile/",
  changePassword: "/auth/change-password/",

  // Utilisateurs
  users: "/auth/utilisateurs/",

  // Membres
  members: "/core/membres/",
  memberDetails: (id: string) => `/core/membres/${id}/`,
  memberFullData: (id: string) => `/core/membres/${id}/donnees_completes/`,
  memberDetailsByUser: (id: string) => `/core/membres/?utilisateur_id=${id}`,

  // Config
  configCurrent: "/core/configurations/current/",
  configurations: "/core/configurations/",

  configUpdate: "/config/update", // 🆕
  
  // Exercices/Sessions
  exerciseCreate: "/exercise/create", // 🆕
  exerciseCurrent: "/core/exercices/current",
  exercises: "/core/exercices/",

  // Sessions
  sessions: "/core/sessions/",
  sessionCurrent: "/core/sessions/current/",

  // Solidarité & Fonds social
  solidarityPayments: "/transactions/paiements-solidarite/",
  socialFundCurrent: "/core/fonds-social/current/",
  socialFundHistory: "/core/fonds-social/",

  // Épargne
  savings: "/transactions/epargne-transactions/",

  // Emprunts & remboursements
  loans: "/transactions/emprunts/",
  createLoan: "/administration/gestion-membres/creer_emprunt/",
  loanStats: "/transactions/emprunts/statistiques/",
  repayments: "/transactions/remboursements/",
  addRepayment: "/administration/gestion-membres/ajouter_remboursement/",
  loanList: "/transactions/emprunts/", // Liste des emprunts
  loanCreate: "/transactions/emprunts/", // Créer emprunt
  loanDetails: (id: string) => `/transactions/emprunts/${id}/`, // Détails emprunt
  // Statuts
  loanStatusInProgress: "?statut=EN_COURS",
  loanStatusInProgressFlag: "?en_cours=true",
  loanStatusRepaid: "?rembourse=true",
  loanStatusOverdue: "?en_retard=true",

  // Montants
  loanAmountMin: "?montant_emprunte_min=100000",
  loanAmountMax: "?montant_emprunte_max=1000000",
  loanTotalMin: "?montant_total_min=200000",
  loanInterestRateMin: "?taux_interet_min=2.5",

  // Pourcentages de remboursement
  loanRepaymentPercentageMin: "?pourcentage_rembourse_min=50",
  loanRepaymentPercentageMax: "?pourcentage_rembourse_max=80",
  loanAlmostRepaid: "?presque_rembourse=true", // >80% remboursé
  loanBarelyRepaid: "?peu_rembourse=true",     // <20% remboursé

  // Dates
  loanThisMonth: "?this_month=true",
  loanThisYear: "?this_year=true",
  loanDateAfter: "?date_emprunt_after=2024-01-01",

  // Renflouements
  renflouements: "/transactions/renflouements/",
  renflouementStats: "/transactions/renflouements/statistiques/",
  renflouementPayments: "/transactions/paiements-renflouement/",

  // Assistances
  assistances: "/transactions/assistances/",
  assistanceTypes: "/core/types-assistance/", 

  // Admin
  adminDashboard: "/administration/dashboard/dashboard_complet/",
  adminMemberManagement: "/administration/gestion-membres/",
  adminReports: "/administration/rapports/rapport_financier_complet/",

  // Création membre complet (admin)
  adminCreateMember: "/administration/gestion-membres/creer_membre_complet/",
};