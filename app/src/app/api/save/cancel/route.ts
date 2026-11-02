import { after } from "next/server";
import { cancelWithoutOffer, confirmOutcome } from "@/lib/retention";
import { currentSubId } from "@/lib/session";
import { REASONS, type CancelReason } from "@/lib/offers";

/** Cancel straight away, without a save offer (the member's "just cancel" path on the cancel page). */
export async function POST(req: Request) {
  const subId = await currentSubId();
  if (!subId) return Response.json({ state: "error", detail: "Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reason = REASONS.some((r) => r.id === body.reason) ? (body.reason as CancelReason) : undefined;
  const r = await cancelWithoutOffer(subId, reason, typeof body.reasonText === "string" ? body.reasonText.slice(0, 500) : undefined);
  const offerId = r.offerId;
  if (offerId && r.state !== "error") after(() => confirmOutcome(offerId, r).catch((e) => console.error(`[email] confirm ${offerId}: ${e.message}`)));
  return Response.json(r, { status: r.state === "error" ? 400 : 200 });
}
