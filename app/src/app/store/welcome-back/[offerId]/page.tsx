import { notFound } from "next/navigation";
import { offerById } from "@/lib/queries";
import { getSub } from "@/lib/retention";
import { Claim } from "./claim";
import { offerTerms } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

/** Landing page behind every email / outbox CTA (recovery, come-back, win-back, save offers). */
export default async function WelcomeBack({ params, searchParams }: { params: Promise<{ offerId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { offerId } = await params;
  const sp = await searchParams;
  const off = await offerById(offerId);
  if (!off) notFound();
  const s = await getSub(off.subscriptionId);
  const first = (s?.name || "").split(" ")[0] || "there";
  const price = s?.priceMonthly ?? 29;
  const terms = offerTerms(off, price);
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <section className="rise overflow-hidden rounded-3xl bg-white shadow-xl shadow-orange-900/10 ring-1 ring-orange-100">
        <div className="bg-gradient-to-br from-[#f9c98a] via-[#f4a261] to-[#e76f51] px-8 py-10 text-[#2a2018]">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-80">{off.kind === "recovery" ? "Quick fix" : off.trigger === "merchant_cancel" ? "Just for you" : "Welcome back"}, {first}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">{off.headline}</h1>
        </div>
        <div className="px-8 py-7">
          <p className="text-[15px] leading-relaxed text-[#4a3b2f]">{off.message}</p>
          {terms && <p className="mt-5 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold text-[#8c3b2a]">{terms}</p>}
          {sp.done ? (
            <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">You&apos;re back! PayPal confirmed your membership. See you on the mat.</p>
          ) : off.status === "declined" || off.status === "lost" ? (
            <p className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-[#6b5a4c]">This offer is no longer available. Your account page has your current options.</p>
          ) : (
            <Claim offerId={off.id} kind={off.kind} status={off.status} approveUrl={off.approveUrl} />
          )}
        </div>
      </section>
    </main>
  );
}
