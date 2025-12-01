// prisma.config.ts
import { defineConfig } from 'prisma';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasources: {
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL,
    },
  },
});
