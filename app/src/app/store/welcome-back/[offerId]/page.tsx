import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
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
  const ended = !sp.done && (off.status === "declined" || off.status === "lost" || off.status === "expired");
  const eyebrow = off.kind === "recovery" ? "Quick fix" : off.trigger === "merchant_cancel" ? "Just for you" : "Welcome back";
  return (
    <main className="mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
      <section aria-labelledby="wb-h" className="rise overflow-hidden rounded-3xl bg-white shadow-xl shadow-orange-900/10 ring-1 ring-orange-100">
        <div className={ended ? "bg-gradient-to-br from-[#fdf0e6] to-[#fde7d3] px-7 py-9 text-warm sm:px-8" : "bg-gradient-to-br from-[#f9c98a] via-[#f4a261] to-[#e76f51] px-7 py-10 text-warm sm:px-8"}>
          <p className="text-sm font-semibold uppercase tracking-widest opacity-80">{eyebrow}, {first}</p>
          <h1 id="wb-h" className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{ended ? "This offer has ended" : off.headline}</h1>
        </div>
        <div className="px-7 py-7 sm:px-8">
          {ended ? (
            <>
              <p className="text-[15px] leading-relaxed text-warm-2">It was either used, turned down or replaced by a newer one. Your account page always shows what&apos;s available to you right now.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/store/account" className="btn-sun !py-3">Go to my account</Link>
                <Link href="/store#pricing" className="btn-warm-outline !py-3">See plans</Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-[15px] leading-relaxed text-warm-2">{off.message}</p>
              {terms && <p className="mt-5 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold text-[#8c3b2a]">{terms}</p>}
              {sp.done ? (
                <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">You&apos;re back! PayPal confirmed your membership. See you on the mat.</p>
              ) : (
                <Claim offerId={off.id} kind={off.kind} status={off.status} approveUrl={off.approveUrl} />
              )}
            </>
          )}
        </div>
      </section>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-[#7a6858]">
        <Lock aria-hidden className="h-3.5 w-3.5" /> Payments are handled by PayPal. Brightside never sees your card.
      </p>
    </main>
  );
}
