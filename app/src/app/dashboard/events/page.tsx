import { EventsGrid } from "@/components/grid/events-grid";
export const dynamic = "force-dynamic";
export default function Events() {
  return (
    <div className="rise">
      <p className="eyebrow">Signature-verified PayPal webhooks</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Event timeline</h1>
      <div className="mt-5"><EventsGrid /></div>
    </div>
  );
}
