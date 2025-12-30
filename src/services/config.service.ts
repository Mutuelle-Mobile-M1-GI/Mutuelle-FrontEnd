import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { MutuelleConfig } from "../types/config.types";

export const fetchConfigCurrent = async (accessToken: string): Promise<MutuelleConfig> => {
  const { data } = await axios.get<MutuelleConfig>(API_BASE_URL + API_ENDPOINTS.configCurrent, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

// ✅ CORRECTION : Ordre logique des paramètres
export const updateMutuelleConfig = async (
  configUpdates: Partial<MutuelleConfig>, 
  accessToken: string,
  idconf: string  // ✅ Type string au lieu de any
): Promise<MutuelleConfig> => {
  const { data } = await axios.patch<MutuelleConfig>(
    `${API_BASE_URL}${API_ENDPOINTS.configurations}${idconf}/`, // ✅ Template string plus propre
    configUpdates,
    {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
};

// 🆕 FONCTION : Créer un nouvel exercice (nouvelle session)
// ✅ CORRECTION : Bons champs selon ta doc API
export const createNewExercise = async (
  exerciseData: {
    nom: string;                    // ✅ Requis selon la doc
    date_debut: string;            // ✅ Requis selon la doc  
    date_fin?: string;       // ✅ Requis selon la doc
    description?: string;          // ✅ Optionnel
    statut?: string;              // ✅ Optionnel (défaut probablement EN_PREPARATION)
  },
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.exercises, // ✅ Bon endpoint
    exerciseData,
    {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
};