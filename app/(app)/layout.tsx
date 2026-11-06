import { Coins, LogOut, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";

import { logout } from "@/app/(auth)/actions";
import { Avatar } from "@/components/badges";
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

  return (
    <div className="min-h-screen md:flex">
      {/* Phone: compact top bar; navigation lives in the bottom tab bar. */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-2.5 backdrop-blur-xl md:hidden">
        <Link href="/dashboard">
          <Logo size={30} />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1",
              lowCredit ? "bg-red-50 text-red-700 ring-red-200" : "bg-brand-50 text-brand-700 ring-brand-100",
            )}
          >
            <Coins className="size-4" /> {credits}
          </Link>
          <UserMenu name={user.name} email={user.email} />
        </div>
      </header>

      {/* Tablet and desktop: sidebar. */}
      <aside className="hidden border-r border-slate-200/80 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-[264px] md:shrink-0 md:flex-col">
        <div className="px-5 pb-4 pt-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <ButtonLink href="/jobs" variant="gradient" className="mb-6 w-full">
            <Sparkles className="size-4" /> Jobs for me
          </ButtonLink>
          <NavLinks newCount={newCount} />
        </div>
        <div className="space-y-3 border-t border-slate-100 p-3">
          <Link
            href="/billing"
            className="block rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-4 text-white shadow-lg shadow-brand-900/20 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-brand-200">{user.plan === "PRO" ? "Pro plan" : "Free plan"}</span>
              <Coins className="size-4 text-brand-300" />
            </div>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", lowCredit && "text-red-300")}>{credits}</p>
            <p className="text-xs text-brand-200/80">{lowCredit ? "Low on credit, top up to keep searching" : "Search credit left"}</p>
            {user.plan !== "PRO" ? (
              <span className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-white/15 py-1.5 text-xs font-semibold ring-1 ring-white/20">
                <Zap className="size-3.5" /> Upgrade to Pro
              </span>
            ) : null}
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <Avatar name={user.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <form action={logout}>
              <button aria-label="Log out" title="Log out" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <BottomNav newCount={newCount} />
    </div>
  );
}
