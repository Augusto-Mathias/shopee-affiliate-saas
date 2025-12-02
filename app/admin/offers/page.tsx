// app/admin/offers/page.tsx
import { prisma } from "../../../src/lib/db/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const offers = await prisma.posted_products.findMany({
    orderBy: { posted_at: "desc" },
    take: 50,
  });

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Últimas ofertas enviadas</h1>

      {offers.length === 0 ? (
        <p>Nenhuma oferta registrada ainda.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Item ID</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Nome</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Preço</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Postado em</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.item_id.toString()}>
                <td style={{ padding: 8, fontFamily: "monospace" }}>{o.item_id.toString()}</td>
                <td style={{ padding: 8 }}>Nome indisponível</td>
                <td style={{ padding: 8 }}>Preço indisponível</td>
                <td style={{ padding: 8 }}>
                  {o.posted_at
                    ? format(new Date(o.posted_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}