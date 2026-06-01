// Utilitaires pour formater montants, dates, etc.

export function formatMoney(amount: number, currency = "FCFA") {
    if (amount === undefined || amount === null) return "-";
    return `${amount.toLocaleString("fr-FR")} ${currency}`;
  }

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount)) || amount < 0) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
  }).format(Number(amount));
}
  
  export function formatDate(date: string | Date, withHour = false) {
    if (!date) return "-";
    const d = new Date(date);
    return withHour
      ? d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
  }
  
  export function formatPercent(value: number, digits: number = 2) {
    if (value === undefined || value === null) return "-";
    return `${value.toFixed(digits)}%`;
  }