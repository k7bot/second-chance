import { redirect } from "next/navigation";
import { currentSubId } from "@/lib/session";
import { getSub } from "@/lib/retention";
import { REASONS } from "@/lib/offers";
import { CancelFlow } from "./flow";
import { emailOn, isPlaceholderSub } from "@/lib/email";

export const dynamic = "force-dynamic";
const DAY = 86_400_000;
const tenure = (start: Date | null) => (start ? Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / (30.44 * DAY))) : 0);

export default async function CancelPage() {
  const id = await currentSubId();
  const s = id ? await getSub(id) : undefined;
  if (!s) redirect("/store/account");
  if (!["ACTIVE", "SUSPENDED"].includes(s.status)) redirect("/store/account");
  const months = tenure(s.startTime);
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <CancelFlow reasons={REASONS}
        sub={{ name: (s.name || "").split(" ")[0] || "there", plan: s.planName || "Brightside Pro", price: s.priceMonthly, nextBill: s.nextBillingAt?.toISOString() ?? null, months, paused: s.status === "SUSPENDED" }}
        practice={s.id.startsWith("DEMO-")}
        canEmailMe={emailOn() && isPlaceholderSub(s)} />
    </main>
  );
}
