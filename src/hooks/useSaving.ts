import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSavings, createSaving, fetchSavingsStats } from "../services/saving.service"; // Ajoute fetchSavingsStats ici
import { SavingTransaction } from "../types/saving.types";
import { getStoredAccessToken } from "../services/auth.service";

// 1. Nouveau hook pour les statistiques globales
export function useSavingsStats() {
  return useQuery({
    queryKey: ["savings-stats"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchSavingsStats(token); // On appelle la nouvelle fonction du service
    },
  });
}

export function useSavings(params?: Record<string, any>) {
  return useQuery<SavingTransaction[]>({
    queryKey: ["savings", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchSavings(token, params);
    },
  });
}

export function useCreateSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createSaving(payload, token);
    },
    onSuccess: () => {
      // 2. On invalide aussi les stats pour qu'elles se rafraîchissent après un dépôt
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["savings-stats"] });
    },
  });
}