import { declineOffer } from "@/lib/retention";
export async function POST(req: Request) {
  const { offerId } = await req.json();
  return Response.json(await declineOffer(offerId));
}
