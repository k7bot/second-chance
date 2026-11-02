import { reconcile } from "@/lib/retention";
export async function POST(req: Request) {
  const { id } = await req.json();
  const s = await reconcile(id);
  return Response.json({ status: s?.status, planId: s?.planId, risk: s?.risk });
}
