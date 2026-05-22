import { useQuery } from "@tanstack/react-query";
import { getStoredAccessToken } from "../services/auth.service";
import axios from "axios";
import { API_BASE_URL } from "../constants/api";

// Hook pour récupérer les dépenses d'une session précise
// Endpoint : GET /api/core/sessions/depenses/?session=<uuid>
export function useSessionDepenses(sessionId?: string) {
  return useQuery({
    queryKey: ["session-depenses", sessionId],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      const { data } = await axios.get(
        `${API_BASE_URL}/core/sessions/depenses/`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: sessionId ? { session: sessionId } : undefined,
        }
      );
      return data;
      // Retourne : { total_collation, total_autre_depense, total_general, nombre_sessions, depenses: [...] }
    },
    enabled: !!sessionId,
  });
}