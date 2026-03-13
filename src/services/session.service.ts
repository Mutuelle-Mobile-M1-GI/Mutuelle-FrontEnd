import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { Session } from "../types/session.types";

// 🆕 Service pour récupérer toutes les sessions
export const fetchSessions = async (accessToken: string, params?: Record<string, any>): Promise<Session[]> => {
  const { data } = await axios.get<Session[]>(
    API_BASE_URL + API_ENDPOINTS.sessions,
    {
      params,
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return Array.isArray(data) ? data : (data.results || []);
};

// 🆕 Service pour créer une nouvelle session
export const createNewSession = async (
  sessionData: {
    nom: string;
    date_session: string;
    montant_collation: number;
    description?: string;
  },
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.sessions,
    sessionData,
    {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
};