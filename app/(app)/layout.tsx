import { Coins, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";

import { Logo } from "@/components/logo";
import { BottomNav, UserMenu } from "@/components/mobile-nav";
import { NavLinks } from "@/components/nav-links";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatCredits } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { affordableResults, autoSearchDue, claimSearch, runSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

// The automatic job search runs after the response on page loads; give it time to finish.
export const maxDuration = 300;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Logged-in visits keep results fresh: search in the background when the last one is old.
  if (autoSearchDue(user) && (await claimSearch(user.id))) after(() => runSearch(user.id));
  const newCount = await prisma.jobPost.count({ where: { userId: user.id, status: "NEW", emails: { not: "" } } });
  const credits = formatCredits(user.creditMicros);
  const lowCredit = !affordableResults(user);
  const isPro = user.plan === "PRO";

  return (
    <div className="min-h-screen md:flex">
      {/* Tablet and desktop: sidebar with the main sections only. */}
      <aside className="hidden border-r border-slate-200/80 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-[248px] md:shrink-0 md:flex-col">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
          <ButtonLink href="/jobs" variant="gradient" className="mb-6 w-full">
            <Sparkles className="size-4" /> Jobs for me
          </ButtonLink>
          <NavLinks newCount={newCount} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: credits, upgrade and the account menu (billing, settings, log out). */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 md:h-16 md:px-10">
          <Link href="/dashboard" className="md:hidden">
            <Logo size={30} />
          </Link>
          <p className="hidden text-sm text-slate-500 md:block">
            Welcome back, <span className="font-semibold text-slate-900">{user.name.split(" ")[0]}</span>
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/billing"
              title={lowCredit ? "Low on credit: top up to keep searching" : "Search credit left"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-colors",
                lowCredit ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100" : "bg-brand-50 text-brand-700 ring-brand-100 hover:bg-brand-100",
              )}
            >
              <Coins className="size-4" /> {credits}
              <span className="hidden font-medium opacity-70 lg:inline">credit</span>
            </Link>
            {!isPro ? (
              <ButtonLink href="/billing" variant="gradient" className="hidden px-3.5 py-2 sm:inline-flex">
                <Zap className="size-4" /> Upgrade
              </ButtonLink>
            ) : (
              <span className="hidden rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 px-2.5 py-1 text-xs font-bold text-white sm:inline">PRO</span>
            )}
            <span className="hidden h-6 w-px bg-slate-200 sm:block" />
            <UserMenu name={user.name} email={user.email} plan={isPro ? "Pro plan" : "Free plan"} />
          </div>
        </header>

        <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:px-10 md:pb-10 md:pt-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <BottomNav newCount={newCount} />
    </div>
  );
}
