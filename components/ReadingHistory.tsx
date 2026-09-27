"use client";

const STORAGE_KEY = "hemeroteca-reading-history";

export type ReadingItem = {
  id: string;
  page: number;
  updatedAt: number;
};

export function getReadingHistory(): ReadingItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const history = JSON.parse(stored);

    if (!Array.isArray(history)) {
      return [];
    }

    return history;
  } catch {
    return [];
  }
}

export function saveReadingProgress(id: string, page: number) {
  try {
    const history = getReadingHistory();

    const next = [
      {
        id,
        page,
        updatedAt: Date.now(),
      },
      ...history.filter((item) => item.id !== id),
    ].slice(0, 6);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // El historial es opcional y no debe romper el visor.
  }
}
