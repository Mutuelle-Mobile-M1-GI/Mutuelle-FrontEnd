// Helpers transversaux pour la mutuelle (statuts, calculs, etc.)

import { MemberStatus } from "../types/member.types";
import { LoanStatus } from "../types/loan.types";

export function getMemberStatusLabel(status: MemberStatus) {
  switch (status) {
    case "EN_REGLE":
      return "En règle";
    case "NON_EN_REGLE":
      return "Non en règle";
    case "SUSPENDU":
      return "Suspendu";
    default:
      return "-";
  }
}

export function getLoanStatusLabel(status: LoanStatus) {
  switch (status) {
    case "EN_COURS":
      return "En cours";
    case "REMBOURSE":
      return "Remboursé";
    case "EN_RETARD":
      return "En retard";
    default:
      return "-";
  }
}