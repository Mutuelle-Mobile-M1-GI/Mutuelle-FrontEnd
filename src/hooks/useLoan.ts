import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLoans, fetchLoanById, createLoan, fetchRepayments, createRepayment } from "../services/loan.service";
import { Loan, Repayment } from "../types/loan.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useLoans(params?: Record<string, any>) {
  return useQuery<Loan[]>({
    queryKey: ["loans", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchLoans(token, params);
    },
  });
}

export function useLoanDetail(id: string) {
  return useQuery<Loan>({
    queryKey: ["loan", id],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchLoanById(id, token);
    },
    enabled: !!id,
  });
}

export function useRepayments(params?: Record<string, any>) {
  return useQuery<Repayment[]>({
    queryKey: ["repayments", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchRepayments(token, params);
    },
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createLoan(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}

export function useCreateRepayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createRepayment(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repayments"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}