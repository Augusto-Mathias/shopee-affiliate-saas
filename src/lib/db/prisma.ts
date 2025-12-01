import { PrismaClient } from '@prisma/client';

declare global {
  // Para evitar múltiplas instâncias no hot reload do Next.js
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;