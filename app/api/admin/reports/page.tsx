// app/admin/reports/page.tsx
"use client";

import React, { useState } from "react";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<{ conversionReports?: number; validatedReports?: number } | null>(null);

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/reports");
      const json = await res.json();
      if (json.ok) setStats({ conversionReports: json.conversionReports, validatedReports: json.validatedReports });
    } catch (err) {
      console.error(err);
    }
  }

  async function start(type: "conversion" | "validated") {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/reports?type=${type}`, { method: "POST" });
      const json = await res.json();
      if (res.status === 202) {
        setMsg(`${type} import started.`);
        // refresh stats after a delay
        setTimeout(fetchStats, 4000);
      } else {
        setMsg(`Erro: ${JSON.stringify(json)}`);
      }
    } catch (err) {
      setMsg(String(err));
    } finally {
      setLoading(false);
    }
  }

  // initial stats
  React.useEffect(() => {
    fetchStats();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Painel de Importação de Relatórios Shopee</h1>
      <p>Importe os relatórios conversionReport e validatedReport.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button onClick={() => start("conversion")} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Iniciando..." : "Importar conversionReport"}
        </button>
        <button onClick={() => start("validated")} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Iniciando..." : "Importar validatedReport"}
        </button>
        <button onClick={() => fetchStats()} style={{ padding: "8px 12px" }}>
          Atualizar status
        </button>
      </div>

      {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}

      <div style={{ marginTop: 12 }}>
        <h3>Estatísticas</h3>
        <div>Conversion reports: {stats?.conversionReports ?? "—"}</div>
        <div>Validated reports: {stats?.validatedReports ?? "—"}</div>
      </div>
    </main>
  );
}