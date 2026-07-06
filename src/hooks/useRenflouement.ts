import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRenflouements, fetchRenflouementPayments, fetchRenflouementStats, createRenflouementPayment, payRenflouementWithSavings, calculateRenflouements } from "../services/renflouement.service";
import { Renflouement, RenflouementPayment } from "../types/renflouement.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useRenflouements(params?: Record<string, any>) {
  return useQuery<Renflouement[]>({
    queryKey: ["renflouements", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchRenflouements(token, params);
    },
    staleTime: 0, // ✅ Toujours refetch lors d'une invalidation (important après clôture exercice)
  });
}

export function useRenflouementsByMembre(membreId: string | null) {
  return useQuery<Renflouement[]>({
    queryKey: ["renflouements-by-membre", membreId],
    enabled: !!membreId,
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchRenflouements(token, { membre: membreId });
    },
    staleTime: 0,
  });
}

export function useRenflouementStats() {
  return useQuery<any>({
    queryKey: ["renflouement-stats"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchRenflouementStats(token);
    },
  });
}

export function useCalculateRenflouements(params?: Record<string, any>) {
  return useQuery<any>({
    queryKey: ["renflouement-calculs", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return calculateRenflouements(token, params);
    },
    // Les calculs peuvent changer lorsque l'exercice change
    staleTime: 5 * 60 * 1000,
  });
}

export function useRenflouementPayments(params?: Record<string, any>) {
  return useQuery<RenflouementPayment[]>({
    queryKey: ["renflouement-payments", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchRenflouementPayments(token, params);
    },
  });
}

export function useCreateRenflouementPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createRenflouementPayment(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renflouements"] });
      queryClient.invalidateQueries({ queryKey: ["renflouement-stats"] });
      queryClient.invalidateQueries({ queryKey: ["caisse-inscription-current"] });
    },
  });
}

export function usePayRenflouementWithSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return payRenflouementWithSavings(payload.renflouementId, payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renflouements"] });
      queryClient.invalidateQueries({ queryKey: ["renflouement-stats"] });
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["member"] });
    },
  });
}