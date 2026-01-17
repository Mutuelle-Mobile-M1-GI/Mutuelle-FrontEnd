import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSavings, createSaving } from "../services/saving.service";
import { SavingTransaction } from "../types/saving.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useSavings(params?: Record<string, any>) {
  return useQuery<SavingTransaction[]>({
    queryKey: ["savings", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchSavings(token, params);
    },
  });
}

export function useCreateSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createSaving(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
    },
  });
}