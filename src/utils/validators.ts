// Validation générique pour les formulaires, montants, etc.

export function isEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  export function isPhone(phone: string): boolean {
    return /^(\+|00)?[0-9]{8,15}$/.test(phone);
  }
  
  export function isRequired(val: any): boolean {
    return val !== undefined && val !== null && val !== "";
  }
  
  export function isPositiveNumber(val: any): boolean {
    return typeof val === "number" && val >= 0;
  }