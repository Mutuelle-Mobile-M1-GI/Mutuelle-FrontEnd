import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchConfigCurrent, 
  updateMutuelleConfig, 
  createNewExercise
} from "../services/config.service";
import { MutuelleConfig } from "../types/config.types";
import { getStoredAccessToken } from "../services/auth.service";

// ✅ Importe la nouvelle fonction en haut du fichier
import {createEmpruntTier } from "../services/config.service";

export const useUpsertTiers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tiers: any[]) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");

      // On boucle sur chaque tranche et on appelle notre service
      const promises = tiers.map(tier => createEmpruntTier(tier, token));
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mutuelle-config"] });
    },
  });
};

// 📖 Query pour récupérer la config actuelle
export function useMutuelleConfig() {
  return useQuery<MutuelleConfig>({
    queryKey: ["mutuelle-config"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchConfigCurrent(token);
    },
    staleTime: 15 * 60 * 1000, // 15 min
  });
}

// ✏️ CORRECTION : Mutation avec objet en paramètre
export function useUpdateMutuelleConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    // ✅ Un seul paramètre : un objet contenant tout
    mutationFn: async ({ 
      configUpdates, 
      idconf 
    }: { 
      configUpdates: Partial<MutuelleConfig>; 
      idconf: string; 
    }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return updateMutuelleConfig(configUpdates, token, idconf);
    },
    onSuccess: (data) => {
      // Mettre à jour le cache avec les nouvelles données
      queryClient.setQueryData(["mutuelle-config"], data);
      // Ou forcer un refetch
      queryClient.invalidateQueries({ queryKey: ["mutuelle-config"] });
    },
    onError: (error) => {
      console.error("Erreur mise à jour config:", error);
    },
  });
}

// 🆕 Mutation pour créer un nouvel exercice
// ✅ CORRECTION : Mutation avec les bons champs
export function useCreateNewExercise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (exerciseData: {
      nom: string;
      date_debut: string;
      date_fin?: string;
      description?: string;
      statut?: string;
    }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createNewExercise(exerciseData, token);
    },
    onSuccess: () => {
      // Invalider le cache pour recharger les données
      queryClient.invalidateQueries({ queryKey: ["mutuelle-config"] });
      queryClient.invalidateQueries({ queryKey: ["exercices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }); // ✅ Refresh le dashboard
    },
    onError: (error) => {
      console.error("Erreur création exercice:", error);
    },
  });
}
