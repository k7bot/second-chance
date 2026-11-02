import { proposeSave } from "@/lib/retention";
import { currentSubId } from "@/lib/session";
import { REASONS, type CancelReason } from "@/lib/offers";
import { clientKey } from "@/lib/guard";

export async function POST(req: Request) {
  const subId = await currentSubId();
  if (!subId) return Response.json({ error: "not signed in" }, { status: 401 });
  const { reason, reasonText } = await req.json();
  if (!REASONS.some((r) => r.id === reason)) return Response.json({ error: "bad reason" }, { status: 400 });
  const offer = await proposeSave(subId, reason as CancelReason, typeof reasonText === "string" ? reasonText.slice(0, 500) : undefined, clientKey(req.headers));
  return Response.json({ offer });
}
