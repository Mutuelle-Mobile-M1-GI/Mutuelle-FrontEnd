import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  login,
  logout as apiLogout,
  getStoredUser,
  refreshToken as apiRefreshToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  updateProfile,
  changePassword,
} from "../services/auth.service";
import { User } from "../types/user.types";
import { ASYNC_STORAGE_KEYS, PIN_LENGTH } from "../constants/config";

// ---- Utilisateur courant (profil) ----
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["current-user"],
    queryFn: async () => getStoredUser(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// ---- Authentification classiques ----
export function useAuth() {
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return login(email, password);
    },
    onSuccess: async ({ user }) => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiLogout();
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });

  return {
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    error: loginMutation.error || logoutMutation.error,
    currentUserQuery: useCurrentUser(),
  };
}

// ---- Gestion du PIN sécurisé ----
export function usePin() {
  const [pin, setPin] = useState<string | null>(null);
  const [isPinSet, setIsPinSet] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(ASYNC_STORAGE_KEYS.pin).then((val) => {
      setPin(val);
      setIsPinSet(!!val);
    });
  }, []);

  const savePin = useCallback(async (newPin: string) => {
    if (newPin.length === PIN_LENGTH) {
      await SecureStore.setItemAsync(ASYNC_STORAGE_KEYS.pin, newPin);
      setPin(newPin);
      setIsPinSet(true);
    }
  }, []);

  const verifyPin = useCallback(
    async (enteredPin: string) => {
      const storedPin = await SecureStore.getItemAsync(ASYNC_STORAGE_KEYS.pin);
      return enteredPin === storedPin;
    },
    [pin]
  );

  const removePin = useCallback(async () => {
    await SecureStore.deleteItemAsync(ASYNC_STORAGE_KEYS.pin);
    setPin(null);
    setIsPinSet(false);
  }, []);

  return {
    pin,
    isPinSet,
    savePin,
    verifyPin,
    removePin,
  };
}

// ---- Edition/MAJ profil ----
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ updates, accessToken }: { updates: Partial<User>; accessToken: string }) => {
      return updateProfile(updates, accessToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

// ---- Changement de mot de passe ----
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({
      old_password,
      new_password,
      new_password_confirm,
      accessToken,
    }: {
      old_password: string;
      new_password: string;
      new_password_confirm: string;
      accessToken: string;
    }) => {
      return changePassword(old_password, new_password, new_password_confirm, accessToken);
    },
  });
}