import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentExercise, fetchCurrentSession, fetchExercises, updateExercise, deleteExercise } from "../services/exercice.service";
import { getStoredAccessToken } from "../services/auth.service";

// 🆕 Hook pour l'exercice en cours
export function useCurrentExercise() {
  return useQuery({
    queryKey: ["current-exercise"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchCurrentExercise(token);
    },
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false, // ⚠️ Ne pas réessayer automatiquement
    networkMode: "always"
  });
}

// 🆕 Hook pour la session actuelle
export function useCurrentSession() {
  return useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchCurrentSession(token);
    },
    staleTime: 2 * 60 * 1000, // 2 min
    retry: false, // ⚠️ Ne pas réessayer automatiquement
    networkMode: "always"
  });
}

// 🆕 Hook pour tous les exercices
/*export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchExercises(token);
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}*/

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchExercises(token);
    },
    // ✅ Réduit à 0 : les données sont immédiatement "stale" après le premier fetch,
    // donc toute invalidation déclenche un vrai refetch.
    staleTime: 0,
  });
}

// 🔄 Hook pour modifier un exercice
export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { exerciseId: string; exerciseData: any }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return updateExercise(payload.exerciseId, payload.exerciseData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["current-exercise"] });
    },
  });
}

// 🗑️ Hook pour supprimer un exercice
export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return deleteExercise(exerciseId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["current-exercise"] });
    },
  });
}