import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { Renflouement, RenflouementPayment } from "../types/renflouement.types";

export const fetchRenflouements = async (accessToken: string, params?: Record<string, any>): Promise<Renflouement[]> => {
  const all: Renflouement[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const { data } = await axios.get<
      Renflouement[] | { results: Renflouement[]; next?: string | null }
    >(`${API_BASE_URL}${API_ENDPOINTS.renflouements}`, {
      params: { ...params, page },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (Array.isArray(data)) {
      return data;
    }

    all.push(...(data?.results ?? []));
    hasNext = Boolean(data?.next);
    page += 1;
  }

  return all;
};

export const fetchRenflouementPayments = async (accessToken: string, params?: Record<string, any>): Promise<RenflouementPayment[]> => {
  const all: RenflouementPayment[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const { data } = await axios.get<
      RenflouementPayment[] | { results: RenflouementPayment[]; next?: string | null }
    >(`${API_BASE_URL}${API_ENDPOINTS.renflouementPayments}`, {
      params: { ...params, page },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (Array.isArray(data)) {
      return data;
    }

    all.push(...(data?.results ?? []));
    hasNext = Boolean(data?.next);
    page += 1;
  }

  return all;
};

export const fetchRenflouementExerciceDetail = async (accessToken: string, exerciceId: string): Promise<any> => {
  const { data } = await axios.get(
    API_BASE_URL + API_ENDPOINTS.renflouementsExerciceDetail,
    {
      params: { exercice_id: exerciceId },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data;
};

export const fetchRenflouementHistoryByMember = async (accessToken: string, memberId: string): Promise<any> => {
  const { data } = await axios.get(
    API_BASE_URL + API_ENDPOINTS.renflouementsParMembre,
    {
      params: { membre_id: memberId },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data;
};

export const fetchRenflouementStats = async (accessToken: string): Promise<any> => {
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.renflouementStats, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const calculateRenflouements = async (accessToken: string, payload?: Record<string, any>): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.repartitionsCalculerRenflouements,
    payload || {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
};

export const createRenflouementPayment = async (payload: any, accessToken: string): Promise<RenflouementPayment> => {
  const { data } = await axios.post<RenflouementPayment>(API_BASE_URL + API_ENDPOINTS.renflouementPayments, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const payRenflouementWithSavings = async (
  renflouementId: string,
  payload: { montant?: number; notes?: string },
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.renflouementPayWithSavings(renflouementId),
    payload,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data;
};