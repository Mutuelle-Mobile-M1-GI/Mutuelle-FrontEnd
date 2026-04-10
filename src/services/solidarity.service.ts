import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { SolidarityPayment, SocialFund } from "../types/solidarity.types";

export const fetchSolidarityPayments = async (accessToken: string, params?: Record<string, any>): Promise<SolidarityPayment[]> => {
  const { data } = await axios.get<SolidarityPayment[]>(API_BASE_URL + API_ENDPOINTS.solidarityPayments, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createSolidarityPayment = async (payload: any, accessToken: string): Promise<SolidarityPayment> => {
  const { data } = await axios.post<SolidarityPayment>(API_BASE_URL + API_ENDPOINTS.solidarityPayments, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchSocialFundCurrent = async (accessToken: string): Promise<SocialFund> => {
  try {
    const { data } = await axios.get<SocialFund>(API_BASE_URL + API_ENDPOINTS.socialFundCurrent, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return data;
  } catch (error: any) {
    // Si l'API retourne une erreur "Aucun fonds", on la lance explicitement
    if (error.response?.status === 404 || error.response?.data?.detail?.includes("Aucun")) {
      const err = new Error("NO_CURRENT_SOCIAL_FUND");
      (err as any).isNoDataError = true;
      throw err;
    }
    throw error;
  }
};