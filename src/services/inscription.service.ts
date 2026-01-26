import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";

export const fetchInscriptionPayments = async (accessToken: string): Promise<any> => {
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.inscriptionPayments, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};
