import { useQuery } from "@tanstack/react-query";
import { getStoredAccessToken } from "../services/auth.service";
import { fetchExercises } from "../services/exercice.service";
import { fetchSessions } from "../services/session.service";

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchExercises(token);
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useSessions(exerciceId?: number) {
  return useQuery({
    queryKey: ["sessions", exerciceId],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      const params = exerciceId ? { exercice: exerciceId } : {};
      return fetchSessions(token, params);
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
