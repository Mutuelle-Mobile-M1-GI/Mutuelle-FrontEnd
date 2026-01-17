// Outils pour manipuler les dates (sessions, exercices...)

export function isSameMonth(dateA: string | Date, dateB: string | Date): boolean {
  const dA = new Date(dateA);
  const dB = new Date(dateB);
  return dA.getFullYear() === dB.getFullYear() && dA.getMonth() === dB.getMonth();
}

export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}