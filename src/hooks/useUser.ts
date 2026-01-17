import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, fetchUserById, createUser } from "../services/user.service";
import { User } from "../types/user.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useUsers(params?: Record<string, any>) {
  return useQuery<User[]>({
    queryKey: ["users", params],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchUsers(token);
    },
  });
}

export function useUserDetail(id: string) {
  return useQuery<User>({
    queryKey: ["user", id],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchUserById(id, token);
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Partial<User>) => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return createUser(user, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}