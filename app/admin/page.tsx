// app/admin/page.tsx
import Link from "next/link";

export default function AdminHome() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Painel Admin</h1>
      <p style={{ color: "#444", marginBottom: 16 }}>
        Bem-vindo ao admin. Aqui você acompanha ofertas, configurações e relatórios.
      </p>

      <nav style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Link href="/admin/offers" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6 }}>
          Últimas ofertas enviadas
        </Link>
        <Link href="/admin/settings" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6 }}>
          Configurações
        </Link>
      </nav>

      <section>
        <h2 style={{ fontSize: 18 }}>Ações rápidas</h2>
        <ul>
          <li>Ver últimas execuções do robô</li>
          <li>Importar relatórios da Shopee (em breve)</li>
          <li>Gerenciar categorias monitoradas</li>
        </ul>
      </section>
    </main>
  );
}