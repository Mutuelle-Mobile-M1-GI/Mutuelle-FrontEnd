// Utilitaires pour formater montants, dates, etc.

export function formatMoney(amount: number, currency = "FCFA") {
    if (amount === undefined || amount === null) return "-";
    return `${amount.toLocaleString("fr-FR")} ${currency}`;
  }
  
  export function formatDate(date: string | Date, withHour = false) {
    if (!date) return "-";
    const d = new Date(date);
    return withHour
      ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-FR");
  }
  
  export function formatPercent(value: number, digits: number = 2) {
    if (value === undefined || value === null) return "-";
    return `${value.toFixed(digits)}%`;
  }