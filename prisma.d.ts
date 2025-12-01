// types/prisma.d.ts
declare module 'prisma' {
  // defineConfig é uma função que recebe um objeto e retorna o mesmo tipo (prisma CLI usa isso)
  export function defineConfig(config: any): any;
  export default defineConfig;
}