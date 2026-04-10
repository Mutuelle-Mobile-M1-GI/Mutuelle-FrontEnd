import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchInscriptionPayments, registerInscription, fetchCaisseInscriptionCurrent, InscriptionPaymentPayload } from "../services/inscription.service";
import { getStoredAccessToken } from "../services/auth.service";
import { CaisseInscription } from "../types/inscription.types";

export function useInscriptionPayments() {
  return useQuery<any>({
    queryKey: ["inscription-payments"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchInscriptionPayments(token);
    },
  });
}

export function useRegisterInscription() {
  return useMutation({
    mutationFn: async (payload: InscriptionPaymentPayload) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return registerInscription(payload, token);
    },
  });
}

export function useCaisseInscriptionCurrent() {
  return useQuery<CaisseInscription>({
    queryKey: ["caisse-inscription-current"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchCaisseInscriptionCurrent(token);
    },
    enabled: true,
    retry: false, // ⚠️ Ne pas réessayer automatiquement
    networkMode: "always"
  });
}
