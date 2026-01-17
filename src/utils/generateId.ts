// src/utils/generateId.ts
export const generateShortId = () => {
    // Gera algo como "X9A2B"
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };