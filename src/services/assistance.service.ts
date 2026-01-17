import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { Assistance } from "../types/assistance.types";

export const fetchAssistances = async (accessToken: string, params?: Record<string, any>): Promise<Assistance[]> => {
  const { data } = await axios.get<Assistance[]>(API_BASE_URL + API_ENDPOINTS.assistances, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createAssistance = async (payload: any, accessToken: string): Promise<Assistance> => {
  const { data } = await axios.post<Assistance>(API_BASE_URL + API_ENDPOINTS.assistances, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const updateAssistance = async (id: string, payload: Partial<Assistance>, accessToken: string): Promise<Assistance> => {
  const { data } = await axios.put<Assistance>(`${API_BASE_URL}${API_ENDPOINTS.assistances}${id}/`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchAssistanceTypes = async (accessToken: string): Promise<any[]> => {
  const { data } = await axios.get<any[]>(API_BASE_URL + API_ENDPOINTS.assistanceTypes, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};