// app/admin/settings/page.tsx
import { prisma } from "../../../src/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // buscamos as settings do usuário 'default'
  const settings = await prisma.user_settings.findUnique({ where: { user_identifier: "default" } });

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Configurações</h1>

      <section style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16 }}>Parâmetros de filtragem</h2>
        <p>Min price: {settings?.min_price ? `R$ ${Number(settings.min_price).toFixed(2)}` : "Não definido"}</p>
        <p>Max price: {settings?.max_price ? `R$ ${Number(settings.max_price).toFixed(2)}` : "Não definido"}</p>
        <p>
          Comissão mínima (%):{" "}
          {settings?.min_commission_rate !== null && settings?.min_commission_rate !== undefined
            ? `${String(settings.min_commission_rate)}%`
            : "Não definido"}
        </p>
        <p>
          Comissão máxima (%):{" "}
          {settings?.max_commission_rate !== null && settings?.max_commission_rate !== undefined
            ? `${String(settings.max_commission_rate)}%`
            : "Não definido"}
        </p>
        <p>Items per page: {settings?.items_per_page ?? "Padrão"}</p>
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>Telegram</h2>
        <p>Chat ID: {process.env.TELEGRAM_CHAT_ID ? "Definido (oculto)" : "Não definido"}</p>
        <p>Bot Token: {process.env.TELEGRAM_BOT_TOKEN ? "Definido (oculto)" : "Não definido"}</p>
      </section>
    </main>
  );
}