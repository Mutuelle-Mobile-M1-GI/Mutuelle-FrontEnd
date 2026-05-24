import { useQuery } from "@tanstack/react-query";
import { fetchEmpruntTiers, EmpruntTier, EmpruntTiersResponse } from "../services/emprunt-tiers.service";
import { getStoredAccessToken } from "../services/auth.service";

/**
 * Récupère les règles de calcul du montant maximal empruntable
 */
export const useEmpruntTiers = () => {
  return useQuery<EmpruntTiersResponse>({
    queryKey: ["emprunt-tiers"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchEmpruntTiers(token);
    },
    staleTime: 1000 * 60 * 60, // 1 heure
  });
};

/**
 * Calcule le montant maximum empruntable basé sur l'épargne et les tiers
 * @param epargne Montant de l'épargne du membre
 * @param tiers Liste des règles de calcul
 * @returns Montant maximum empruntable
 */
export const calculateMaxEmpruntable = (epargne: number, tiers: EmpruntTier[]): number => {
  if (!tiers || tiers.length === 0 || epargne <= 0) return 0;

  // Trouver la tranche correspondant à l'épargne
  const applicableTier = tiers.find(
    (tier) => epargne >= tier.min_amount && epargne <= tier.max_amount
  );

  if (!applicableTier) {
    // Si l'épargne dépasse tous les tiers, utiliser le dernier
    const lastTier = tiers.reduce((prev, current) =>
      current.max_amount > prev.max_amount ? current : prev
    );
    const maxBrutCalcule = epargne * parseFloat(lastTier.coefficient);
    return lastTier.max_cap ? Math.min(maxBrutCalcule, lastTier.max_cap) : maxBrutCalcule;
  }

  // Calculer le montant brut (épargne × coefficient)
  const maxBrutCalcule = epargne * parseFloat(applicableTier.coefficient);

  // Appliquer le cap si défini
  return applicableTier.max_cap
    ? Math.min(maxBrutCalcule, applicableTier.max_cap)
    : maxBrutCalcule;
};
