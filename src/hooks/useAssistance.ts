import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAssistances, createAssistance, updateAssistance, fetchAssistanceTypes } from "../services/assistance.service";
import { Assistance } from "../types/assistance.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useAssistances(params?: Record<string, any>) {
  return useQuery<Assistance[]>({
    queryKey: ["assistances", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchAssistances(token, params);
    },
  });
}

export function useCreateAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createAssistance(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    },
  });
}

export function useUpdateAssistance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Assistance> }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return updateAssistance(id, payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    },
  });
}

export function useAssistanceTypes() {
  return useQuery<any[]>({
    queryKey: ["assistance-types"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchAssistanceTypes(token);
    },
    staleTime: 20 * 60 * 1000,
  });
}