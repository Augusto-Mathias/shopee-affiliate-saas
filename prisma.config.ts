// prisma.config.ts (na raiz)
import { defineConfig } from 'prisma';

export default defineConfig({
  schema: './prisma/schema.prisma',
  // Esse objeto aqui é para migrate/CLI; para o client, exporte também a config do client:
  client: {
    adapter: {
      type: 'postgresql',
      url: process.env.DATABASE_URL,
    },
  },
});