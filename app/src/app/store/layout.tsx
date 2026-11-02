import Link from "next/link";
import { SunLogo } from "@/components/ui";
import { currentSubId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const signedIn = !!(await currentSubId());
  return (
    <div className="min-h-screen bg-cream text-[#2a2018]">
      <header className="sticky top-0 z-20 border-b border-orange-100/80 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
          <Link href="/store"><SunLogo /></Link>
          <nav className="hidden gap-6 text-sm text-[#6b5a4c] md:flex">
            <Link href="/store#classes" className="hover:text-[#2a2018]">Classes</Link>
            <Link href="/store#pricing" className="hover:text-[#2a2018]">Pricing</Link>
            <Link href="/store#teachers" className="hover:text-[#2a2018]">Teachers</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/store/account" className="btn-ghost !border-orange-200 !bg-white/70">{signedIn ? "My membership" : "Sign in"}</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-orange-100 py-10 text-center text-xs text-[#8a7868]">
        Brightside Yoga is a fictional studio for the Second Chance demo. Payments run on the PayPal sandbox.{" "}
        <Link href="/dashboard" className="underline underline-offset-2">Merchant dashboard →</Link>
      </footer>
    </div>
  );
}
