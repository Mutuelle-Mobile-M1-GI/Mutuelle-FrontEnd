import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAssistances, fetchAssistancesByMember, fetchAssistance, createAssistance,createAssistances , updateAssistance, fetchAssistanceType, fetchAssistanceTypes, } from "../services/assistance.service";
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

export function useAssistancesByMember(memberId?: string) { // Ajoute le ?
  return useQuery<any>({
    queryKey: ["assistances-by-member", memberId],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      // On est sûr que memberId existe ici grâce à 'enabled'
      return fetchAssistancesByMember(memberId!, token); 
    },
    enabled: !!memberId && memberId.length > 0, // Sécurité renforcée
  });
}

export function useAssistance(params?: Record<string, any>) {
  return useQuery<Assistance[]>({
    queryKey: ["assistances", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchAssistance(token, params);
    },
  });
}


export function useCreateAssistances() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createAssistances(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistances"] });
    },
  });
}

export function useAssistanceType() {
  return useQuery<any[]>({
    queryKey: ["assistance-types"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchAssistanceType(token);
    },
    staleTime: 20 * 60 * 1000,
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
//export function useDeleteAssistance() {
  //const queryClient = useQueryClient();

  //return useMutation<void, Error, string>({
    //mutationFn: async (id: string) => {
      //const token = await getStoredAccessToken();
      //if (!token) throw new Error("Token manquant");

      //await deleteAssistanceType(id, token);
    //},
    //onSuccess: () => {
      // Invalide la liste des types d'assistance pour forcer le refetch
      //queryClient.invalidateQueries({ queryKey: ["assistance-types"] });
    //},
    //onError: (error) => {
      //console.error("Erreur suppression type assistance:", error);
      // L'erreur sera gérée dans le composant (via isError, error)
    //},
  //});
//}
