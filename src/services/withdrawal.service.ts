import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { WithdrawalTransaction, WithdrawalCreatePayload, SavingsAvailable } from "../types/withdrawal.types";

export const fetchWithdrawals = async (
  accessToken: string,
  params?: Record<string, any>
): Promise<WithdrawalTransaction[]> => {
  const { data } = await axios.get<WithdrawalTransaction[]>(
    API_BASE_URL + API_ENDPOINTS.withdrawals,
    {
      params,
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};

export const createWithdrawal = async (
  payload: WithdrawalCreatePayload,
  accessToken: string
): Promise<WithdrawalTransaction> => {
  const { data } = await axios.post<WithdrawalTransaction>(
    API_BASE_URL + API_ENDPOINTS.withdrawalCreate,
    payload,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};

export const fetchSavingsAvailable = async (
  memberId: string,
  accessToken: string
): Promise<SavingsAvailable> => {
  const { data } = await axios.get<SavingsAvailable>(
    API_BASE_URL + API_ENDPOINTS.savingsAvailable(memberId),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};

export const fetchWithdrawalsByMember = async (
  memberId: string,
  accessToken: string
): Promise<WithdrawalTransaction[]> => {
  const { data } = await axios.get<WithdrawalTransaction[]>(
    API_BASE_URL + API_ENDPOINTS.withdrawalByMember(memberId),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};

export const fetchWithdrawalsByStatus = async (
  status: string,
  accessToken: string
): Promise<WithdrawalTransaction[]> => {
  const { data } = await axios.get<WithdrawalTransaction[]>(
    API_BASE_URL + API_ENDPOINTS.withdrawalByStatus(status),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};
