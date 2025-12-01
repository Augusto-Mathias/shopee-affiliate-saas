// src/lib/db/settings.ts
// Hotfix temporário: evita referências a prisma.settings (tabela removida).
// For now: retorna um sortType padrão e faz saveNextSortType como no-op (log).
// Depois: implementar persistência (ex.: coluna current_sort_type em user_settings).

import { prisma } from '@/src/lib/db/prisma';

const DEFAULT_SORT_TYPE = 1;

export async function getCurrentSortType(): Promise<number> {
  try {
    // Tentativa futura: ler de uma tabela persistente (user_settings/app_meta).
    // Por enquanto, garantimos que sempre retornamos um número válido.
    // Se você quiser, podemos tentar ler de user_settings (se adicionar coluna).
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
    // Exemplo futuro (quando adicionar coluna):
    // await prisma.user_settings.upsert({...})
  } catch (err) {
    console.warn('saveNextSortType hotfix failed (ignored):', err);
  }
}