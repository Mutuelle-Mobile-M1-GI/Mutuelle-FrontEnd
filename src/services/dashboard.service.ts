import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { DashboardData } from "../types/dashboard.types";

export const fetchAdminDashboard = async (accessToken: string): Promise<DashboardData> => {
  const { data } = await axios.get<DashboardData>(API_BASE_URL + API_ENDPOINTS.adminDashboard, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};