import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboard } from "../services/dashboard.service";
import { DashboardData } from "../types/dashboard.types";
import { getStoredAccessToken } from "../services/auth.service";

export function useAdminDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");
      return fetchAdminDashboard(token);
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });
}