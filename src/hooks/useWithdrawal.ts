import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWithdrawals,
  createWithdrawal,
  fetchSavingsAvailable,
  fetchWithdrawalsByMember,
  fetchWithdrawalsByStatus,
} from "../services/withdrawal.service";
import { WithdrawalTransaction, WithdrawalCreatePayload, SavingsAvailable } from "../types/withdrawal.types";
import { getStoredAccessToken } from "../services/auth.service";

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

      // Le retrait est immédiatement approuvé et débité côté backend
      return await createWithdrawal(payload, token);
    },
    onSuccess: async () => {
      // Invalider et refetch tous les queries concernant l'épargne
      // S'assurer que les données sont bien reloadées avant de mettre à jour l'UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["withdrawals"] }),
        queryClient.invalidateQueries({ queryKey: ["savings"] }),
        queryClient.invalidateQueries({ queryKey: ["savings-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["savings-available"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] }),
      ]);
    },
  });
}

export function useSavingsAvailable(memberId: string | null) {
  return useQuery<SavingsAvailable | null>({
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
