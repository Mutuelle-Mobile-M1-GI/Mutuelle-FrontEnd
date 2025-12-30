import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { Loan, Repayment } from "../types/loan.types";

export const fetchLoans = async (accessToken: string, params?: Record<string, any>): Promise<Loan[]> => {
  const { data } = await axios.get<Loan[]>(API_BASE_URL + API_ENDPOINTS.loans, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchLoanById = async (id: string, accessToken: string): Promise<Loan> => {
  const { data } = await axios.get<Loan>(`${API_BASE_URL}${API_ENDPOINTS.loans}${id}/`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createLoan = async (payload: any, accessToken: string): Promise<Loan> => {
  const { data } = await axios.post<Loan>(API_BASE_URL + API_ENDPOINTS.createLoan, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchRepayments = async (accessToken: string, params?: Record<string, any>): Promise<Repayment[]> => {
  const { data } = await axios.get<Repayment[]>(API_BASE_URL + API_ENDPOINTS.repayments, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createRepayment = async (payload: any, accessToken: string): Promise<Repayment> => {
  const { data } = await axios.post<Repayment>(API_BASE_URL + API_ENDPOINTS.addRepayment, payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};