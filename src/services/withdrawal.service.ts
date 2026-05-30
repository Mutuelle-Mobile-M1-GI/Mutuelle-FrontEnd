import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { WithdrawalTransaction, WithdrawalCreatePayload } from "../types/withdrawal.types";

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
): Promise<{ epargne_disponible: number }> => {
  const { data } = await axios.get(
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

// Dans withdrawal.service.ts
export const approveWithdrawal = async (
  withdrawalId: string,
  accessToken: string
): Promise<WithdrawalTransaction> => {
  const { data } = await axios.post<WithdrawalTransaction>(
    API_BASE_URL + API_ENDPOINTS.withdrawalApprove(withdrawalId),
    null, // ← null au lieu de {}
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};


export const rejectWithdrawal = async (
  withdrawalId: string,
  notesAdmin?: string,
  accessToken?: string
): Promise<WithdrawalTransaction> => {
  const { data } = await axios.post<WithdrawalTransaction>(
    API_BASE_URL + API_ENDPOINTS.withdrawalReject(withdrawalId),
    { notes_admin: notesAdmin },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return data;
};
