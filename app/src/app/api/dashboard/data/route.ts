import { gridData } from "@/lib/grid-data";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await gridData(), { headers: { "Cache-Control": "no-store" } });
}
