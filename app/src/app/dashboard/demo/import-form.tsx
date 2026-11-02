"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImportForm() {
  const [id, setId] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <form className="mt-4 flex flex-wrap items-center gap-2" onSubmit={async (e) => {
      e.preventDefault();
      const r = await fetch("/api/demo/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id.trim() }) });
      const j = await r.json(); setMsg(r.ok ? `Imported (${j.status})` : j.error); router.refresh();
    }}>
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="I-XXXXXXXXXXXX" className="w-56 rounded-xl border border-line px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-teal-200" />
      <button className="btn-ghost">Import from PayPal</button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </form>
  );
}
