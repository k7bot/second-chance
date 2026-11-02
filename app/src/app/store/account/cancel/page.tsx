import { redirect } from "next/navigation";
import { currentSubId } from "@/lib/session";
import { getSub } from "@/lib/retention";
import { REASONS } from "@/lib/offers";
import { CancelFlow } from "./flow";

export const dynamic = "force-dynamic";

export default async function CancelPage() {
  const id = await currentSubId();
  const s = id ? await getSub(id) : undefined;
  if (!s) redirect("/store/account");
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <CancelFlow reasons={REASONS} sub={{ name: (s.name || "").split(" ")[0] || "there", plan: s.planName || "Brightside Pro", price: s.priceMonthly, nextBill: s.nextBillingAt?.toISOString() ?? null }} />
    </main>
  );
}
