import { cookies } from "next/headers";
import { syncFromPayPal } from "@/lib/retention";
import { COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const { subscriptionID } = await req.json();
  if (!/^I-[A-Z0-9]+$/.test(subscriptionID || "")) return Response.json({ error: "bad id" }, { status: 400 });
  const s = await syncFromPayPal(subscriptionID, "store");
  (await cookies()).set(COOKIE, subscriptionID, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  return Response.json({ ok: true, status: s?.status });
}
