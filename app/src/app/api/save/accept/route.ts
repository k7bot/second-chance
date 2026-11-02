import { after } from "next/server";
import { acceptOffer, confirmOutcome } from "@/lib/retention";
export async function POST(req: Request) {
  const { offerId } = await req.json();
  const r = await acceptOffer(offerId);
  after(() => confirmOutcome(offerId, r).catch((e) => console.error(`[email] confirm ${offerId}: ${e.message}`)));
  return Response.json(r);
}
