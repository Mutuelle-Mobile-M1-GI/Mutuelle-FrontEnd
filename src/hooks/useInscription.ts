import { useQuery } from "@tanstack/react-query";
import { fetchInscriptionPayments } from "../services/inscription.service";
import { getStoredAccessToken } from "../services/auth.service";

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
