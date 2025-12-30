// Helpers pour les recherches, la normalisation...

export function normalizeSearch(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire accents
      .replace(/[^a-z0-9]/g, ""); // retire ponctuation
  }