import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNewSession } from "../services/session.service";
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
      description?: string;
      exercice:string;
    }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createNewSession(sessionData, token);
    },
    onSuccess: () => {
      // Invalider le cache pour recharger les données
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
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
      const { data } = await axios.get(
        API_BASE_URL + API_ENDPOINTS.sessionCurrent,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    },
  });
}