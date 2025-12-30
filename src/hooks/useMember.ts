import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMembers, fetchMemberById, fetchMemberFullData, addInscriptionPayment, createFullMember, fetchMemberByUserId } from "../services/member.service";
import { Member } from "../types/member.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useMembers(params?: Record<string, any>) {
  return useQuery<Member[]>({
    queryKey: ["members", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      const response = await fetchMembers(token, params);
      console.log("🔍 Réponse API membres:", response);
      return response;
    },
  });
}

export function useMemberDetail(id: string) {
  return useQuery<Member>({
    queryKey: ["member", id],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchMemberById(id, token);
    },
    enabled: !!id,
  });
}
export function useMemberDetailByUser(id: string) {
  return useQuery<Member>({
    queryKey: ["member", id],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchMemberByUserId(id, token);
    },
    enabled: !!id,
  });
}

export function useMemberFinance(id: string) {
  return useQuery<any>({
    queryKey: ["member-full", id],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchMemberFullData(id, token);
    },
    enabled: !!id,
  });
}


export function useCreateFullMember() {
  const queryClient = useQueryClient();
  console.log("*************** UTILISATION DU HOOK DE CREATION DE MEMEBRE ***********")
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createFullMember(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useAddInscriptionPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      membre_id,
      montant,
      notes,
    }: {
      membre_id: string;
      montant: number;
      notes: string;
    }) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return addInscriptionPayment(membre_id, montant, notes, token);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}