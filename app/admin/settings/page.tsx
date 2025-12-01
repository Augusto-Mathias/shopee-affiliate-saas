// app/admin/settings/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type Settings = {
  id?: number;
  user_identifier?: string;
  min_price?: string | number | null;
  max_price?: string | number | null;
  min_commission_rate?: string | number | null;
  max_commission_rate?: string | number | null;
  items_per_page?: number | null;
  // outros campos opcionais podem ser adicionados
};

export default function AdminSettingsPageClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("401 Unauthorized — faça login (Basic Auth) e recarregue a página.");
          }
          throw new Error(`Erro ao buscar settings: ${res.status}`);
        }
        const data = await res.json();
        if (mounted) setSettings(data.settings ?? null);
      } catch (err: any) {
        setErrorMsg(err.message ?? "Erro desconhecido");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  function setField<T extends keyof Settings>(key: T, value: Settings[T]) {
    setSettings((s) => ({ ...(s ?? {}), [key]: value }));
  }

  async function onSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      // normalize numbers to either number or empty string (endpoint handles parse)
      const payload: any = {
        min_price: settings?.min_price ?? null,
        max_price: settings?.max_price ?? null,
        min_commission_rate: settings?.min_commission_rate ?? null,
        max_commission_rate: settings?.max_commission_rate ?? null,
        items_per_page: settings?.items_per_page ?? null,
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("401 Unauthorized — faça login (Basic Auth) e recarregue a página.");
        }
        const txt = await res.text();
        throw new Error(`Erro ao salvar: ${res.status} ${txt}`);
      }

      const data = await res.json();
      setSettings(data.settings ?? null);
      setStatusMsg("Configurações salvas com sucesso.");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Erro desconhecido ao salvar");
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <h1>Configurações</h1>
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Configurações</h1>

      {errorMsg && (
        <div style={{ marginBottom: 12, color: "crimson", background: "#fff0f0", padding: 10, borderRadius: 6 }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
        <label>
          Min price (R$)
          <input
            type="number"
            step="0.01"
            value={settings?.min_price ?? ""}
            onChange={(e) => setField("min_price", e.target.value === "" ? null : e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Max price (R$)
          <input
            type="number"
            step="0.01"
            value={settings?.max_price ?? ""}
            onChange={(e) => setField("max_price", e.target.value === "" ? null : e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Min commission rate (%)
          <input
            type="number"
            step="0.01"
            value={settings?.min_commission_rate ?? ""}
            onChange={(e) => setField("min_commission_rate", e.target.value === "" ? null : e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Max commission rate (%)
          <input
            type="number"
            step="0.01"
            value={settings?.max_commission_rate ?? ""}
            onChange={(e) => setField("max_commission_rate", e.target.value === "" ? null : e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Items per page
          <input
            type="number"
            step="1"
            value={settings?.items_per_page ?? ""}
            onChange={(e) => setField("items_per_page", e.target.value === "" ? null : Number(e.target.value))}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 14px",
              background: "#0b63ff",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>

          {statusMsg && <span style={{ color: "green" }}>{statusMsg}</span>}
        </div>
      </form>
    </main>
  );
}