import { acceptOffer } from "@/lib/retention";
export async function POST(req: Request) {
  const { offerId } = await req.json();
  return Response.json(await acceptOffer(offerId));
}
