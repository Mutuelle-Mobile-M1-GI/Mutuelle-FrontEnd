import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSolidarityPayments, createSolidarityPayment, fetchSocialFundCurrent } from "../services/solidarity.service";
import { SolidarityPayment, SocialFund } from "../types/solidarity.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useSolidarityPayments(params?: Record<string, any>) {
  return useQuery<SolidarityPayment[]>({
    queryKey: ["solidarity-payments", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchSolidarityPayments(token, params);
    },
  });
}

export function useCreateSolidarityPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createSolidarityPayment(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solidarity-payments"] });
      queryClient.invalidateQueries({ queryKey: ["social-fund-current"] });
    },
  });
}

export function useSocialFundCurrent() {
  return useQuery<SocialFund>({
    queryKey: ["social-fund-current"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchSocialFundCurrent(token);
    },
    staleTime: 5 * 60 * 1000,
  });
}