import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../constants/api";
import { Member } from "../types/member.types";

export const fetchMembers = async (accessToken: string, params?: Record<string, any>): Promise<Member[]> => {
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.members, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log("📡 RESPONSE COMPLETE:", data);
  
  // 🔧 Gestion de la réponse paginée
  if (data && Array.isArray(data.results)) {
    console.log("✅ MEMBRES TROUVÉS:", data.results.length);
    return data.results;
  } else if (Array.isArray(data)) {
    console.log("✅ MEMBRES DIRECTS:", data.length);
    return data;
  } else {
    console.log("⚠️ RÉPONSE INATTENDUE:", typeof data);
    return [];
  }
};

export const fetchMemberById = async (id: string, accessToken: string): Promise<Member> => {
  const { data } = await axios.get<Member>(API_BASE_URL + API_ENDPOINTS.memberDetails(id), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const fetchMemberByUserId = async (id: string, accessToken: string): Promise<Member> => {
  const { data } = await axios.get<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Member[];
  }>(API_BASE_URL + API_ENDPOINTS.memberDetailsByUser(id), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  console.log("📡 Réponse API complète:", data);
  
  // 🔧 CORRECTION: Filtrer le membre dont l'utilisateur ID correspond
  if (!data.results || data.results.length === 0) {
    throw new Error("Aucun membre trouvé pour cet utilisateur");
  }
  
  const member = data.results.find((m: Member) => m.utilisateur?.id === id) || data.results[0];
  console.log("✅ Membre extrait:", member);
  console.log("💰 Données financières:", member.donnees_financieres);
  
  return member;
};


export const fetchMemberFullData = async (id: string, accessToken: string) => {
  const { data } = await axios.get(API_BASE_URL + API_ENDPOINTS.memberFullData(id), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data;
};

export const createFullMember = async (
  data: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    telephone: string;
    password?: string;
    photo_profil?: string | null;
    date_inscription?: string;
    montant_inscription_initial?: number;
  },
  accessToken: string
): Promise<any> => {
  console.log("************* UTILISATION DU SERVICE DE CREATION DE MEMEBRE *****************")
  console.log(data)
  console.log("**********************************************************************************")
  const { data: resp } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.adminCreateMember,
    data,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log("************************** REPONSE A LA CREATION DE MEMBRE **********************")
  console.log(resp)
  console.log("**********************************************************************************")
  return resp;
};

export const addInscriptionPayment = async (
  membre_id: string,
  montant: number,
  notes: string,
  sessionId: string,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.inscriptionPayments,
    { 
      membre: membre_id, 
      montant: montant.toString(), 
      session: sessionId,
      notes: notes || undefined
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
};

export const activateMember = async (
  memberId: string,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.activateMember(memberId),
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
};

export const deactivateMember = async (
  memberId: string,
  accessToken: string
): Promise<any> => {
  const { data } = await axios.post(
    API_BASE_URL + API_ENDPOINTS.deactivateMember(memberId),
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
};