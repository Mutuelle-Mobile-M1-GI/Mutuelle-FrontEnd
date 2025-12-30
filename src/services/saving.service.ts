import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { SavingTransaction } from "../types/saving.types";

export const fetchSavings = async (accessToken: string, params?: Record<string, any>): Promise<SavingTransaction[]> => {
  const { data } = await axios.get<SavingTransaction[]>(API_BASE_URL + API_ENDPOINTS.savings, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createSaving = async (payload: any, accessToken: string): Promise<SavingTransaction> => {
  const { data } = await axios.post<SavingTransaction>(API_BASE_URL + API_ENDPOINTS.savings, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};