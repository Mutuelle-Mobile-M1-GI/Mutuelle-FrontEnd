import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { getStoredAccessToken } from "./auth.service";

// 🆕 Service pour récupérer l'exercice en cours
export const fetchCurrentExercise = async (accessToken: string): Promise<any> => {
  console.log("FESTHHH")
  const { data } = await axios.get(
    API_BASE_URL + API_ENDPOINTS.exerciseCurrent,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  console.log("EXERCICE RECUPERE : ," ,data)
  return data;
};

// 🆕 Service pour récupérer la session actuelle
export const fetchCurrentSession = async (accessToken: string): Promise<any> => {
  const { data } = await axios.get(
    API_BASE_URL + API_ENDPOINTS.sessionCurrent,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  console.log("SESSION RECUPERE : ," ,data)
  return data;
};

// 🆕 Service pour récupérer tous les exercices
export const fetchExercises = async (accessToken: string): Promise<any[]> => {
  const { data } = await axios.get(
    API_BASE_URL + API_ENDPOINTS.exercises,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data.results || data; // Selon la pagination de ton API
};

// 🔄 Service pour modifier un exercice EN_COURS
export const updateExercise = async (
  exerciseId: string,
  exerciseData: {
    nom?: string;
    description?: string;
    date_debut?: string;
    date_fin?: string;
  },
  accessToken: string
): Promise<any> => {
  const { data } = await axios.patch(
    `${API_BASE_URL}${API_ENDPOINTS.exercises}${exerciseId}/update_params/`,
    exerciseData,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data;
};

// 🗑️ Service pour supprimer un exercice
export const deleteExercise = async (
  exerciseId: string,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.delete(
    `${API_BASE_URL}${API_ENDPOINTS.exercises}${exerciseId}/`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data;
};