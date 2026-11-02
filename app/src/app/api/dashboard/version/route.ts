import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
export const dynamic = "force-dynamic";
/** Cheap change token: the client polls this and only refetches the grid data when it moves. */
export async function GET() {
  const db = await getDb();
  const r: any = await db.execute(sql`select
    (select coalesce(max(updated_at)::text,'') || count(*) from subscribers) as s,
    (select coalesce(max(received_at)::text,'') || count(*) from events) as e,
    (select coalesce(max(coalesce(resolved_at, created_at))::text,'') || count(*) || sum(case when status='saved' then 1 else 0 end) from offers) as o`);
  const row = (r.rows ?? r)[0] ?? {};
  return Response.json({ v: `${row.s}|${row.e}|${row.o}` }, { headers: { "Cache-Control": "no-store" } });
}
