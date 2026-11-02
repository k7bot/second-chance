import { allOutbox, subsByIds, TRIGGER_LABEL } from "@/lib/queries";
import { emailFrom, emailOn, isPlaceholderSub } from "@/lib/email";
import { SendToMe } from "@/components/send-to-me";
import { AutoRefresh } from "@/components/client";
import { Badge, Empty, ago } from "@/components/ui";
import { SunLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

const TONE: Record<string, any> = { payment_failed: "red", suspended: "amber", paypal_cancelled: "violet", merchant_cancel: "teal", confirmation: "green" };

function Delivery({ m }: { m: { deliveryStatus: string; deliveryDetail: string | null; providerMessageId: string | null; deliveredTo: string | null; sentAt: Date | null } }) {
  if (m.deliveryStatus === "sent") return (
    <span className="inline-flex flex-wrap items-center gap-1.5" title={m.providerMessageId ? `Resend id ${m.providerMessageId}` : undefined}>
      <Badge tone="green" dot>Sent</Badge>
      <span>to {m.deliveredTo}{m.sentAt ? ` · ${ago(m.sentAt)}` : ""}</span>
      {m.providerMessageId && <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink-2 ring-1 ring-line">{m.providerMessageId.slice(0, 8)}</code>}
    </span>
  );
  if (m.deliveryStatus === "failed") return (
    <span className="inline-flex items-center gap-1.5" title={m.deliveryDetail || undefined}><Badge tone="red" dot>Failed</Badge><span className="max-w-[18rem] truncate">{m.deliveryDetail}</span></span>
  );
  return <span className="inline-flex items-center gap-1.5" title={m.deliveryDetail || undefined}><Badge tone="slate">Outbox only</Badge>{m.deliveryDetail && <span>{m.deliveryDetail}</span>}</span>;
}

export default async function Outbox() {
  const msgs = await allOutbox();
  const subs = new Map((await subsByIds([...new Set(msgs.map((m) => m.subscriptionId).filter(Boolean) as string[])])).map((s) => [s.id, s]));
  const on = emailOn();
  const sentCount = msgs.filter((m) => m.deliveryStatus === "sent").length;
  return (
    <div className="rise">
      <AutoRefresh />
      <p className="eyebrow">Messages · {on ? "real email via Resend" : "outbox only"}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Outbox</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {on
          ? <>Every message Second Chance sends, with its delivery status. Real members get email from <span className="font-medium text-ink-2">{emailFrom().replace(/^.*</, "").replace(/>$/, "")}</span>; practice and sample members have placeholder addresses, so theirs stay here (use &ldquo;Email this to me&rdquo; to see the real thing). {sentCount > 0 && <>{sentCount} sent so far.</>}</>
          : <>Every message Second Chance would send to each subscriber. Email delivery is not switched on for this deployment, so messages stay here.</>}
      </p>
      <div className="mt-8 space-y-5">
        {msgs.length === 0 && <Empty title="Outbox is empty">Payment failures, suspensions and PayPal cancellations create messages here.</Empty>}
        {msgs.map((m) => (
          <article key={m.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-stone-50/60 px-5 py-3 text-xs text-muted">
              <span>To <span className="font-semibold text-ink">{m.toName || "Subscriber"}</span> &lt;{m.toEmail || "unknown"}&gt;</span>
              <Badge tone={TONE[m.trigger || ""] || "slate"}>{TRIGGER_LABEL[m.trigger || ""] || m.trigger}</Badge>
              <Delivery m={m} />
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
              {on && (() => { const s = m.subscriptionId ? subs.get(m.subscriptionId) : undefined; return s && isPlaceholderSub(s) && m.deliveryStatus !== "sent"; })() && (
                <div className="mx-auto mt-4 flex max-w-lg justify-center"><SendToMe outboxId={m.id} tone="dashboard" label="Email this to me" /></div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
