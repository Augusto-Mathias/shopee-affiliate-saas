// src/lib/db/settings.ts
// Hotfix temporário: evita referências a prisma.settings (tabela removida).
// For now: retorna um sortType padrão e faz saveNextSortType como no-op (log).
// Depois: implementar persistência (ex.: coluna current_sort_type em user_settings).

import { prisma } from '@/src/lib/db/prisma';

const DEFAULT_SORT_TYPE = 1;

export async function getCurrentSortType(): Promise<number> {
  try {
    // Temporariamente retornamos um valor padrão.
    // FUTURO: ler de user_settings ou app_meta quando adicionar persistência.
    return DEFAULT_SORT_TYPE;
  } catch (err) {
    console.warn('getCurrentSortType fallback to default due to error:', err);
    return DEFAULT_SORT_TYPE;
  }
}

export async function saveNextSortType(nextSortType: number): Promise<void> {
  try {
    // Hotfix: não persiste ainda. Apenas logamos para inspeção.
    // FUTURO: persistir em user_settings (nova coluna) ou em uma tabela app_meta.
    console.log(`saveNextSortType called (hotfix no-op). nextSortType=${nextSortType}`);
  } catch (err) {
    console.warn('saveNextSortType hotfix failed (ignored):', err);
  }
}