import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWithdrawals,
  createWithdrawal,
  fetchSavingsAvailable,
  fetchWithdrawalsByMember,
  fetchWithdrawalsByStatus,
  approveWithdrawal,
  rejectWithdrawal,
} from "../services/withdrawal.service";
import { WithdrawalTransaction, WithdrawalCreatePayload } from "../types/withdrawal.types";
import { getStoredAccessToken } from "../services/auth.service";
import { API_ENDPOINTS } from "../constants/api";

export function useWithdrawals(params?: Record<string, any>) {
  return useQuery<WithdrawalTransaction[]>({
    queryKey: ["withdrawals", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchWithdrawals(token, params);
    },
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WithdrawalCreatePayload) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");

      // 1. Créer le retrait
      const created = await createWithdrawal(payload, token);

      // 2. L'approuver immédiatement
      const approved = await approveWithdrawal(created.id, token);

      return approved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["savings-stats"] });
      queryClient.invalidateQueries({ queryKey: ["savings-available"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}

export function useSavingsAvailable(memberId: string | null) {
  return useQuery({
    queryKey: ["savings-available", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchSavingsAvailable(memberId, token);
    },
    enabled: !!memberId,
  });
}

export function useWithdrawalsByMember(memberId: string | null) {
  return useQuery<WithdrawalTransaction[]>({
    queryKey: ["withdrawals-by-member", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchWithdrawalsByMember(memberId, token);
    },
    enabled: !!memberId,
  });
}

export function useWithdrawalsByStatus(status: string) {
  return useQuery<WithdrawalTransaction[]>({
    queryKey: ["withdrawals-by-status", status],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchWithdrawalsByStatus(status, token);
    },
  });
}

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return approveWithdrawal(withdrawalId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}


export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ withdrawalId, notesAdmin }: { withdrawalId: string; notesAdmin?: string }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return rejectWithdrawal(withdrawalId, notesAdmin, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}
