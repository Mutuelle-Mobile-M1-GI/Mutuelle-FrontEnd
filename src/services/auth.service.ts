import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { ASYNC_STORAGE_KEYS } from "../constants/config";
import { User } from "../types/user.types";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthTokens {
  access: string;
  refresh: string;
}

export const login = async (email: string, password: string): Promise<{ tokens: AuthTokens; user: User }> => {
  const { data: tokens } = await axios.post<AuthTokens>(API_BASE_URL + API_ENDPOINTS.login, { email, password });

  // Stock tokens
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.accessToken, tokens.access);
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.refreshToken, tokens.refresh);

  // Get user profile
  const { data: user } = await axios.get<User>(API_BASE_URL + API_ENDPOINTS.me, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.currentUser, JSON.stringify(user));

  return { tokens, user };
};

export const refreshToken = async (refresh: string): Promise<AuthTokens> => {
  const { data } = await axios.post<AuthTokens>(API_BASE_URL + API_ENDPOINTS.refresh, { refresh });
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.accessToken, data.access);
  return data;
};

export const logout = async () => {
  await AsyncStorage.multiRemove([
    ASYNC_STORAGE_KEYS.accessToken,
    ASYNC_STORAGE_KEYS.refreshToken,
    ASYNC_STORAGE_KEYS.currentUser,
  ]);
  await SecureStore.deleteItemAsync(ASYNC_STORAGE_KEYS.pin);
};

export const getStoredAccessToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(ASYNC_STORAGE_KEYS.accessToken);
};

export const getStoredRefreshToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(ASYNC_STORAGE_KEYS.refreshToken);
};

export const getStoredUser = async (): Promise<User | null> => {
  const data = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.currentUser);
  return data ? JSON.parse(data) : null;
};

export const updateProfile = async (updates: Partial<User>, accessToken: string): Promise<User> => {
  const { data } = await axios.patch<User>(
    API_BASE_URL + API_ENDPOINTS.updateProfile,
    updates,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.currentUser, JSON.stringify(data));
  return data;
};

export const changePassword = async (
  old_password: string,
  new_password: string,
  new_password_confirm: string,
  accessToken: string
): Promise<void> => {
  await axios.post(
    API_BASE_URL + API_ENDPOINTS.changePassword,
    { old_password, new_password, new_password_confirm },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};