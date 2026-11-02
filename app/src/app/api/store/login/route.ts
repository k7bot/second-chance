import { cookies } from "next/headers";
import { getSub } from "@/lib/retention";
import { COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id || !(await getSub(id))) return Response.json({ error: "unknown subscription" }, { status: 404 });
  (await cookies()).set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  return Response.json({ ok: true });
}
