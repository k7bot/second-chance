import { Check, PlayCircle, Sunrise, Users, Waves } from "lucide-react";
import { cfg } from "@/lib/config";
import { PayPalSubscribe } from "./paypal-button";

export const dynamic = "force-dynamic";

const CLASSES = [
  { t: "Sunrise Flow", d: "20 min · All levels", c: "from-amber-200 to-orange-300", i: Sunrise },
  { t: "Deep Stretch", d: "35 min · Gentle", c: "from-rose-200 to-orange-200", i: Waves },
  { t: "Power Vinyasa", d: "45 min · Strong", c: "from-orange-300 to-red-300", i: PlayCircle },
  { t: "Live Community", d: "Daily · 7am & 6pm", c: "from-lime-200 to-amber-200", i: Users },
];

export default function Store() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 md:grid-cols-2 md:pt-20">
        <div className="rise">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sun">Online yoga studio</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-6xl">Ten minutes on the mat can change your whole day.</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#6b5a4c]">Live and on-demand classes from teachers who actually remember your name. Cancel, pause or switch plans anytime.</p>
          <div className="mt-8 flex gap-3">
            <a href="#pricing" className="btn-sun !px-6 !py-3 text-base">Start practising</a>
            <a href="#classes" className="btn-ghost !border-orange-200 !px-6 !py-3 text-base">See classes</a>
          </div>
          <p className="mt-6 text-sm text-[#8a7868]">★★★★★ 4.9 from 2,300+ members</p>
        </div>
        <div className="relative aspect-[4/3.4] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f9c98a] via-[#f4a261] to-[#e76f51] shadow-2xl shadow-orange-900/20">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#fde68a]/70 blur-2xl" />
          <svg viewBox="0 0 400 340" className="absolute inset-0 h-full w-full">
            <circle cx="290" cy="110" r="54" fill="#fff4d6" opacity=".9" />
            <path d="M0 260 Q 100 210 200 250 T 400 240 V340 H0Z" fill="#c8553d" opacity=".55" />
            <path d="M0 290 Q 120 250 220 285 T 400 280 V340 H0Z" fill="#8c3b2a" opacity=".55" />
            <g stroke="#2a2018" strokeWidth="9" strokeLinecap="round" fill="none">
              <circle cx="160" cy="118" r="15" fill="#2a2018" />
              <path d="M160 135 L160 205" /><path d="M160 150 L105 112" /><path d="M160 150 L215 112" />
              <path d="M160 205 L128 262" /><path d="M160 205 L205 240 L178 262" />
            </g>
          </svg>
          <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 px-4 py-3 text-sm shadow-lg backdrop-blur">
            <p className="font-semibold">Live now · Sunrise Flow</p>
            <p className="text-[#8a7868]">with Maya · 142 practising</p>
          </div>
        </div>
      </section>

      <section id="classes" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="font-serif text-3xl">This week on Brightside</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CLASSES.map((c) => (
            <div key={c.t} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
              <div className={`flex h-28 items-end bg-gradient-to-br ${c.c} p-4`}><c.i className="h-7 w-7 text-[#2a2018]/70" /></div>
              <div className="p-4"><p className="font-semibold">{c.t}</p><p className="text-sm text-[#8a7868]">{c.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-serif text-4xl">Simple membership</h2>
          <p className="mt-2 text-[#6b5a4c]">Billed monthly through PayPal. No contracts.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <Plan name="Lite" price={15} blurb="For a gentle, steady practice."
            perks={["Full on-demand library", "2 live classes a week", "Progress tracking"]}
            button={<PayPalSubscribe clientId={cfg.clientId} planId={cfg.plans.lite} />} />
          <Plan name="Pro" price={29} featured blurb="Everything, every day."
            perks={["Unlimited live classes", "Full on-demand library", "Monthly 1:1 with a teacher", "Workshops & retreats access"]}
            button={<PayPalSubscribe clientId={cfg.clientId} planId={cfg.plans.pro} />} />
        </div>
      </section>

      <section id="teachers" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 rounded-[2rem] bg-[#2a2018] p-10 text-[#fdf0e6] md:grid-cols-3">
          {[["Maya R.", "Vinyasa & breath"], ["Tomás L.", "Strength & mobility"], ["Aiko S.", "Yin & restorative"]].map(([n, s]) => (
            <div key={n}><p className="font-serif text-2xl">{n}</p><p className="text-sm text-[#d9c3ae]">{s}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Plan({ name, price, blurb, perks, featured, button }: { name: string; price: number; blurb: string; perks: string[]; featured?: boolean; button: React.ReactNode }) {
  return (
    <div className={featured ? "relative rounded-3xl bg-white p-8 shadow-xl shadow-orange-900/10 ring-2 ring-sun" : "rounded-3xl bg-white/70 p-8 ring-1 ring-orange-100"}>
      {featured && <span className="absolute -top-3 left-8 rounded-full bg-sun px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
      <p className="font-serif text-2xl">{name}</p>
      <p className="mt-1 text-sm text-[#8a7868]">{blurb}</p>
      <p className="mt-6"><span className="font-serif text-5xl">${price}</span><span className="text-[#8a7868]"> / month</span></p>
      <ul className="mt-6 space-y-2.5 text-sm">
        {perks.map((p) => <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4 text-sun" /> {p}</li>)}
      </ul>
      <div className="mt-8">{button}</div>
    </div>
  );
}
