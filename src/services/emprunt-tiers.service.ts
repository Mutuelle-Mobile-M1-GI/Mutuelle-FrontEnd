import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";

export interface EmpruntTier {
  id: number;
  min_amount: number;
  max_amount: number;
  coefficient: string;
  max_cap: number | null;
  created_at: string;
  updated_at: string;
  display: string;
}

export interface EmpruntTiersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EmpruntTier[];
}

/**
 * Récupère les règles de calcul du montant maximal empruntable
 */
export const fetchEmpruntTiers = async (token: string): Promise<EmpruntTiersResponse> => {
  const response = await fetch(`${API_BASE_URL}`+ API_ENDPOINTS.empruntTiers, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération des tiers d'emprunt: ${response.statusText}`);
  }

  return response.json();
};
