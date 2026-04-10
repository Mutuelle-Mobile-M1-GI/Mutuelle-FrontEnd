import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { CaisseInscription } from "../types/inscription.types";

export const fetchInscriptionPayments = async (accessToken: string): Promise<any> => {
  console.log("Params inscription:", params);
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.inscriptionPayments, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchCaisseInscriptionCurrent = async (accessToken: string): Promise<CaisseInscription> => {
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.caisse_inscription_current, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export interface InscriptionPaymentPayload {
  membre: string;
  montant: string;
  session: string;
  notes?: string;
}

export const registerInscription = async (
  payload: InscriptionPaymentPayload,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.registerInscription,
    payload,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return data;
};
