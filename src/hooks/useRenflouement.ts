import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRenflouements, fetchRenflouementStats, createRenflouementPayment } from "../services/renflouement.service";
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
    },
  });
}