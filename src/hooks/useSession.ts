import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNewSession, updateSession, deleteSession, closeSession } from "../services/session.service";
import { getStoredAccessToken } from "../services/auth.service";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import axios from "axios";

// 🆕 Hook pour créer une nouvelle session
export function useCreateNewSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionData: {
      nom: string;
      date_session: string;
      montant_collation: number;
      montant_autre_depense?: number;
      motif_autre_depense?: string;
      description?: string;
      exercice: string;
    }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createNewSession(sessionData, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-session"] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["renflouements"] });
      await queryClient.refetchQueries({ queryKey: ["renflouement-stats"] });
    },
    onError: (error) => {
      console.error("Erreur création session:", error);
    },
  });
}

export function useCurrentSession() {
  return useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      try {
        const { data } = await axios.get(
          API_BASE_URL + API_ENDPOINTS.sessionCurrent,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return data;
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
  });
}

// 📋 Hook pour lister les sessions d'un exercice (admin)
export function useSessions(params?: { exercice?: string | number }) {
  const exerciceId = params?.exercice ? String(params.exercice) : undefined;
  return useQuery({
    queryKey: ["sessions", exerciceId],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      const { data } = await axios.get(
        API_BASE_URL + API_ENDPOINTS.sessions,
        {
          headers: { Authorization: `Bearer ${token}` },
          // Filtre OBLIGATOIRE par exercice — sans ça, toutes les sessions de tous les exercices sont retournées
          params: { exercice: exerciceId },
        }
      );
      return data;
    },
    // Ne lancer la requête que si on a un exerciceId valide (non vide, non "undefined")
    enabled: !!exerciceId && exerciceId !== "undefined",
  });
}

// 🔄 Hook pour modifier une session
export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sessionId: string; sessionData: any }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return updateSession(payload.sessionId, payload.sessionData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// 🗑️ Hook pour supprimer une session
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return deleteSession(sessionId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// 🏁 Hook pour clore une session (la passer à "Terminé")
export function useCloseSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return closeSession(sessionId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}