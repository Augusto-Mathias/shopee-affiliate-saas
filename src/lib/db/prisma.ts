// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // evita múltiplas instâncias durante HMR no Next.js
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // opcional: ajusta logs do client
  });

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;