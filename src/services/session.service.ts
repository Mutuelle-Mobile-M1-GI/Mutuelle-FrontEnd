import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";

// 🆕 Service pour créer une nouvelle session
export const createNewSession = async (
  sessionData: {
    nom: string;
    date_session: string;
    montant_collation: number;
    montant_depense?: number;
    motif_depense?: string;
    description?: string;
    exercice: string;
  },
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.sessions,
    sessionData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return data;
};