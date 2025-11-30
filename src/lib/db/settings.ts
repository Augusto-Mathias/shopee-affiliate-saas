import { prisma } from './prisma';

const SORT_KEY = 'sortType';

export async function getCurrentSortType(): Promise<number> {
  const setting = await prisma.settings.findUnique({
    where: { key: SORT_KEY },
  });

  // se não existir ainda, começamos do 1 (como no n8n)
  if (!setting) {
    return 1;
  }

  const n = Number(setting.value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 1;
}

export async function saveNextSortType(current: number): Promise<number> {
  // mesma lógica do seu node do n8n:
  // se chegou em 5, volta pra 1, senão soma 1
  const next = current >= 5 ? 1 : current + 1;

  await prisma.settings.upsert({
    where: { key: SORT_KEY },
    update: { value: String(next) },
    create: {
      key: SORT_KEY,
      value: String(next),
    },
  });

  return next;
}