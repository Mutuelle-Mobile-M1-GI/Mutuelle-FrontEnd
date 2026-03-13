import { useQuery } from "@tanstack/react-query";
import { getStoredAccessToken } from "../services/auth.service";
import { fetchSolidarityPayments } from "../services/solidarity.service";
import { fetchSavings } from "../services/saving.service";
import { fetchLoans, fetchRepayments } from "../services/loan.service";
import { fetchAssistances } from "../services/assistance.service";

export interface Operation {
  id: string;
  type: "INSCRIPTION" | "SOLIDARITE" | "AIDE" | "EMPRUNT" | "REMBOURSEMENT" | "EPARGNE";
  membre: string;
  montant: number;
  date: string;
  session_id: string | number | null;
  description: string;
  raw?: any;
}

export function useOperationsHistory(sessionId?: string | number | null) {
  return useQuery<Operation[]>({
    queryKey: ["operations-history", sessionId],
    queryFn: async () => {
      const token = await getStoredAccessToken();
      if (!token) throw new Error("Token manquant");

      const params = sessionId ? { session: sessionId } : {};

      // Récupérer tous les types de transactions en parallèle
      const [solidarities, savings, loans, repayments, assistances] = await Promise.all([
        fetchSolidarityPayments(token, params).catch(() => []),
        fetchSavings(token, params).catch(() => []),
        fetchLoans(token, params).catch(() => []),
        fetchRepayments(token, params).catch(() => []),
        fetchAssistances(token, params).catch(() => []),
      ]);

      const operations: Operation[] = [];

      // Ajouter les paiements de solidarité
      solidarities.forEach((item: any) => {
        operations.push({
          id: item.id,
          type: "SOLIDARITE",
          membre: item.membre_info?.nom_complet || item.membre,
          montant: item.montant,
          date: item.date_paiement,
          session_id: item.session,
          description: `Paiement solidarité${item.notes ? " - " + item.notes : ""}`,
          raw: item,
        });
      });

      // Ajouter les épargnes
      savings.forEach((item: any) => {
        operations.push({
          id: item.id,
          type: "EPARGNE",
          membre: item.membre_info?.nom_complet || item.membre,
          montant: item.montant,
          date: item.date_transaction,
          session_id: item.session,
          description: `Versement épargne${item.notes ? " - " + item.notes : ""}`,
          raw: item,
        });
      });

      // Ajouter les emprunts
      loans.forEach((item: any) => {
        operations.push({
          id: item.id,
          type: "EMPRUNT",
          membre: item.membre_info?.nom_complet || item.membre,
          montant: item.montant_emprunte,
          date: item.date_emprunt,
          session_id: item.session_emprunt,
          description: `Prêt accordé${item.notes ? " - " + item.notes : ""}`,
          raw: item,
        });
      });

      // Ajouter les remboursements
      repayments.forEach((item: any) => {
        operations.push({
          id: item.id,
          type: "REMBOURSEMENT",
          membre: item.emprunt_info?.membre_nom || item.emprunt,
          montant: item.montant,
          date: item.date_remboursement,
          session_id: item.session,
          description: `Remboursement${item.notes ? " - " + item.notes : ""}`,
          raw: item,
        });
      });

      // Ajouter les assistances (seulement les payées)
      assistances.forEach((item: any) => {
        if (item.statut === "PAYEE" || item.statut === "APPROUVEE") {
          operations.push({
            id: item.id,
            type: "AIDE",
            membre: item.membre_info?.nom_complet || item.membre,
            montant: item.montant,
            date: item.date_paiement || item.date_demande,
            session_id: item.session,
            description: `${item.type_assistance_info?.nom || "Assistance"}${item.notes ? " - " + item.notes : ""}`,
            raw: item,
          });
        }
      });

      // Trier par date (plus récent en premier)
      operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return operations;
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });
}
