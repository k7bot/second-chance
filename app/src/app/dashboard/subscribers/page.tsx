import { SubscribersGrid } from "@/components/grid/subscribers-grid";
export const dynamic = "force-dynamic";
export default function Subscribers() {
  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">PayPal Subscriptions · AG Grid Enterprise</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Subscribers</h1>
        </div>
        <p className="max-w-md text-right text-xs text-muted">Drag columns into the group bar, open any row for its PayPal timeline, select cells to chart them. Rows update live as webhooks arrive.</p>
      </div>
      <div className="mt-5"><SubscribersGrid /></div>
    </div>
  );
}
