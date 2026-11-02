import { OffersGrid } from "@/components/grid/offers-grid";
export const dynamic = "force-dynamic";
export default function Offers() {
  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">What works, for which churn signal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers & revenue</h1>
        </div>
        <p className="max-w-md text-right text-xs text-muted">A live pivot of every offer by trigger and type, with an AG Grid Integrated Chart linked to it.</p>
      </div>
      <div className="mt-5"><OffersGrid /></div>
    </div>
  );
}
