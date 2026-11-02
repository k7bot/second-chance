"use client";
import { useRouter } from "next/navigation";

export function SignInList({ subs }: { subs: { id: string; name: string | null; email: string | null; status: string; plan: string | null; practice?: boolean }[] }) {
  const router = useRouter();
  if (!subs.length) return (
    <div className="mt-8 rounded-2xl bg-white p-6 text-sm text-[#8a7868] ring-1 ring-orange-100">
      No members yet.{" "}
      <button className="font-semibold text-sun underline underline-offset-2" onClick={async () => { await fetch("/api/demo/seed", { method: "POST" }); router.refresh(); }}>Add practice members</button>
    </div>
  );
  return (
    <ul className="mt-8 space-y-3">
      {subs.map((s) => (
        <li key={s.id}>
          <button onClick={async () => { await fetch("/api/store/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) }); router.refresh(); }}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-orange-100 transition hover:ring-sun">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-800">{(s.name || "?")[0]}</span>
            <span className="flex-1"><span className="block font-semibold">{s.name || s.email || s.id}</span><span className="text-sm text-[#8a7868]">{s.plan} · {s.status.toLowerCase().replace("_", " ")}</span></span>
            {s.practice
              ? <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">Practice member</span>
              : <span className="font-mono text-[11px] text-[#b3a395]">{s.id}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SignOut() {
  const router = useRouter();
  return <button className="text-sm text-[#8a7868] hover:text-[#2a2018]" onClick={async () => { await fetch("/api/store/logout", { method: "POST" }); router.refresh(); }}>Switch member</button>;
}
