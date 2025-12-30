import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { User } from "../types/user.types";

export const fetchUsers = async (accessToken: string): Promise<User[]> => {
  const { data } = await axios.get<User[]>(API_BASE_URL + API_ENDPOINTS.users, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchUserById = async (id: string, accessToken: string): Promise<User> => {
  const { data } = await axios.get<User>(`${API_BASE_URL}${API_ENDPOINTS.users}${id}/`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createUser = async (user: Partial<User>, accessToken: string): Promise<User> => {
  const { data } = await axios.post<User>(API_BASE_URL + API_ENDPOINTS.users, user, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};