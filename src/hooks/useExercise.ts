import { useQuery } from "@tanstack/react-query";
import { fetchCurrentExercise, fetchCurrentSession, fetchExercises } from "../services/exercice.service";
import { getStoredAccessToken } from "../services/auth.service";

// 🆕 Hook pour l'exercice en cours
export function useCurrentExercise() {
  return useQuery({
    queryKey: ["current-exercise"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      console.log("appel de fetch exercise")
      return fetchCurrentExercise(token);
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// 🆕 Hook pour la session actuelle
export function useCurrentSession() {
  return useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      console.log("appel de fetch session")
      return fetchCurrentSession(token);
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

// 🆕 Hook pour tous les exercices
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchExercises(token);
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}