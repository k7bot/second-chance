import Link from "next/link";
import { SunLogo } from "@/components/ui";
import { currentSubId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const signedIn = !!(await currentSubId());
  return (
    <div className="theme-store flex min-h-screen flex-col bg-cream text-warm">
      <a href="#main" className="sr-only-focusable fixed left-4 top-3 z-50 rounded-full bg-warm px-4 py-2 text-sm font-semibold text-white">Skip to content</a>
      <header className="sticky top-0 z-20 border-b border-orange-100/80 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-5 py-3.5 sm:px-6">
          <Link href="/store" aria-label="Brightside Yoga home"><SunLogo /></Link>
          <nav aria-label="Studio" className="hidden gap-6 text-sm text-warm-muted md:flex">
            <Link href="/store#classes" className="hover:text-warm">Classes</Link>
            <Link href="/store#pricing" className="hover:text-warm">Pricing</Link>
            <Link href="/store#teachers" className="hover:text-warm">Teachers</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/store/account" className="btn-warm-outline !px-3.5 !py-2">{signedIn ? "My membership" : "Sign in"}</Link>
          </div>
        </div>
      </header>
      <div id="main" className="flex-1">{children}</div>
      <footer className="border-t border-orange-100 px-6 py-10 text-center text-xs leading-relaxed text-warm-muted">
        <p>Brightside Yoga is a fictional studio for the Second Chance demo. Payments run on the PayPal sandbox, so no real money moves.</p>
        <p className="mt-1.5"><Link href="/dashboard" className="font-medium underline underline-offset-2 hover:text-warm">See the merchant dashboard →</Link></p>
      </footer>
    </div>
  );
}
