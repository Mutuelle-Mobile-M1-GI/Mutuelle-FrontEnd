import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { Renflouement, RenflouementPayment } from "../types/renflouement.types";

export const fetchRenflouements = async (accessToken: string, params?: Record<string, any>): Promise<Renflouement[]> => {
  const { data } = await axios.get<Renflouement[]>(API_BASE_URL + API_ENDPOINTS.renflouements, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchRenflouementStats = async (accessToken: string): Promise<any> => {
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.renflouementStats, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createRenflouementPayment = async (payload: any, accessToken: string): Promise<RenflouementPayment> => {
  const { data } = await axios.post<RenflouementPayment>(API_BASE_URL + API_ENDPOINTS.renflouementPayments, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};