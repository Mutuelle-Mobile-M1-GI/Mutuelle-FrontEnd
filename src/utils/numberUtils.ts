// Outils pour manipuler les nombres (arrondi, etc.)

export function round(value: number, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }