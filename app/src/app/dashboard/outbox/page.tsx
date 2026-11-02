import { allOutbox, TRIGGER_LABEL } from "@/lib/queries";
import { AutoRefresh } from "@/components/client";
import { Badge, Empty, ago } from "@/components/ui";
import { SunLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

const TONE: Record<string, any> = { payment_failed: "red", suspended: "amber", paypal_cancelled: "violet", merchant_cancel: "teal" };

export default async function Outbox() {
  const msgs = await allOutbox();
  return (
    <div className="rise">
      <AutoRefresh />
      <p className="eyebrow">Messages · not sent in v0</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Outbox</h1>
      <p className="mt-2 text-sm text-muted">What Second Chance would send to each subscriber. Real email delivery is switched off in the demo.</p>
      <div className="mt-8 space-y-5">
        {msgs.length === 0 && <Empty title="Outbox is empty">Payment failures, suspensions and PayPal cancellations create messages here.</Empty>}
        {msgs.map((m) => (
          <article key={m.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-stone-50/60 px-5 py-3 text-xs text-muted">
              <span>To <span className="font-semibold text-ink">{m.toName || "Subscriber"}</span> &lt;{m.toEmail || "unknown"}&gt;</span>
              <Badge tone={TONE[m.trigger || ""] || "slate"}>{TRIGGER_LABEL[m.trigger || ""] || m.trigger}</Badge>
              <span className="ml-auto">{ago(m.createdAt)}</span>
            </div>
            <div className="bg-cream px-6 py-7 sm:px-10">
              <div className="mx-auto max-w-lg rounded-2xl bg-white p-7 shadow-sm ring-1 ring-orange-100">
                <SunLogo className="text-base" />
                <h3 className="mt-5 font-serif text-2xl leading-snug">{m.subject}</h3>
                {m.body.split("\n\n").map((p, i) => <p key={i} className="mt-3 text-[15px] leading-relaxed text-ink-2">{p}</p>)}
                {m.ctaUrl && <a href={m.ctaUrl} className="btn-sun mt-6">{m.ctaLabel || "Open"}</a>}
                <p className="mt-6 text-xs text-muted">Billing is handled securely by PayPal. Brightside Yoga · Sent by Second Chance</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
