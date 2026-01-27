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
    onSuccess: async () => {
      // Invalider et refetch le cache pour recharger les données
      await queryClient.invalidateQueries({ queryKey: ["current-session"] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      // ✅ IMPORTANT : Refetch aussi les renflouements si ils dépendent de la session
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
        // Si le serveur retourne 404 (aucune session en cours), retourner null
        if (error?.response?.status === 404) {
          return null;
        }
        // Pour les autres erreurs, les relancer
        throw error;
      }
    },
  });
}