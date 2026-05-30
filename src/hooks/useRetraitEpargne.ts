// hooks/useRetraitEpargne.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_ENDPOINTS } from "../constants/api";

export const useRetraitsEpargne = (filters: { session?: string | number } = {}) =>
  useQuery({
    queryKey: ["retraits-epargne", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.session) params.append("session", String(filters.session));
      const res = await axios.get(
        `${API_ENDPOINTS.withdrawals}?${params.toString()}`
      );
      return res.data;
    },
  });