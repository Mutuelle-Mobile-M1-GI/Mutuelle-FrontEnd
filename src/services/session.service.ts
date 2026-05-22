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
        "Content-Type": "application/json",
      },
    }
  );
  return Array.isArray(data) ? data : (data as any).results || [];
};

// 🆕 Service pour créer une nouvelle session
// ⚠️ Les champs dépense s'appellent montant_autre_depense / motif_autre_depense côté API
export const createNewSession = async (
  sessionData: {
    nom: string;
    date_session: string;
    montant_collation: number;
    montant_autre_depense?: number;
    motif_autre_depense?: string;
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

// 🔄 Service pour modifier une session EN_COURS
export const updateSession = async (
  sessionId: string,
  sessionData: {
    nom?: string;
    description?: string;
    date_session?: string;
    montant_collation?: number;
  },
  accessToken: string
): Promise<any> => {
  const { data } = await axios.patch(
    `${API_BASE_URL}${API_ENDPOINTS.sessions}${sessionId}/update_params/`,
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

// 🗑️ Service pour supprimer une session
export const deleteSession = async (
  sessionId: string,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.delete(
    `${API_BASE_URL}${API_ENDPOINTS.sessions}${sessionId}/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return data;
};

// 🏁 Service pour clore une session
export const closeSession = async (
  sessionId: string,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.patch(
    `${API_BASE_URL}${API_ENDPOINTS.closeSession(sessionId)}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return data;
};