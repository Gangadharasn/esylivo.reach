import { Check, Coins, Gift, Search, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { paymentsBypassed } from "@/lib/lemonsqueezy";
import { formatCredits, FREE_CREDIT_USD, PRO_CREDIT_USD, PRO_PRICE_USD } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { searchCostEstimate } from "@/lib/search";
import { cn, timeAgo } from "@/lib/utils";

import { ManageButton, UpgradeButton } from "./billing-buttons";

export const metadata: Metadata = { title: "Billing & credits" };

const KIND_ICON = { SIGNUP_BONUS: Gift, SUBSCRIPTION: Sparkles, SEARCH: Search, ADJUSTMENT: Coins } as const;

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const user = await requireUser();
  const { upgraded } = await searchParams;
  const history = await prisma.creditTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const perSearch = searchCostEstimate(user);
  const searchesLeft = perSearch ? Math.floor(Math.max(0, user.creditMicros) / perSearch) : 0;
  const isPro = user.plan === "PRO";
  const low = user.creditMicros < perSearch;

  return (
    <>
      <PageHeader title="Billing & credits" description="Searching job sites uses credits. Every account starts with free credit; Pro adds more every month." />

      {upgraded ? (
        <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Thanks for upgrading! Your credit is added as soon as the payment is confirmed (usually within a minute).
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={cn("p-6 lg:col-span-1", low ? "ring-2 ring-red-200" : "")}>
          <p className="text-sm text-slate-500">Credit balance</p>
          <p className={cn("mt-1 text-4xl font-semibold tabular-nums", low ? "text-red-600" : "text-slate-900")}>{formatCredits(user.creditMicros)}</p>
          <p className="mt-2 text-sm text-slate-600">
            A search with your current settings uses up to <strong>{formatCredits(perSearch)}</strong>
            {perSearch ? (
              <>
                {" "}
                · about <strong>{searchesLeft}</strong> search{searchesLeft === 1 ? "" : "es"} left
              </>
            ) : null}
            .
          </p>
          {low ? <p className="mt-2 text-sm font-medium text-red-600">Not enough credit for a full search. Upgrade to keep finding jobs.</p> : null}
          <p className="mt-3 text-xs text-slate-500">
            Searches are charged for the results actually found, so most cost less than the maximum. Fewer sites, keywords or results per keyword
            make each search cheaper.
          </p>
        </Card>

        <Card className="p-6">
          <p className="font-semibold text-slate-900">Free</p>
          <p className="mt-1 text-3xl font-semibold">$0</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <Feature>${FREE_CREDIT_USD} welcome credit</Feature>
            <Feature>All four job sites</Feature>
            <Feature>Tailored resumes and email apply</Feature>
          </ul>
          {!isPro ? <p className="mt-5 text-sm font-medium text-slate-500">Your current plan</p> : null}
        </Card>

        <Card className="relative p-6 ring-2 ring-brand-300">
          <span className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 px-3 py-0.5 text-xs font-semibold text-white">Pro</span>
          <p className="font-semibold text-slate-900">Pro</p>
          <p className="mt-1 text-3xl font-semibold">
            ${PRO_PRICE_USD}
            <span className="text-base font-normal text-slate-500">/month</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <Feature>${PRO_CREDIT_USD} credit added every month</Feature>
            <Feature>Unused credit carries over</Feature>
            <Feature>Automatic search and auto-apply</Feature>
            <Feature>Cancel anytime</Feature>
          </ul>
          <div className="mt-5">
            {isPro ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  {user.planStatus === "cancelled"
                    ? `Cancelled. Pro until ${user.planRenewsAt?.toLocaleDateString("en-IN") ?? "the end of the period"}.`
                    : user.planStatus === "past_due"
                      ? "Payment failed. Please update your card."
                      : `Active${user.planRenewsAt ? `, renews ${user.planRenewsAt.toLocaleDateString("en-IN")}` : ""}.`}
                </p>
                {user.lsSubscriptionId ? <ManageButton /> : null}
                <UpgradeButton label="Buy another month of credit" />
              </div>
            ) : (
              <UpgradeButton label={`Upgrade for $${PRO_PRICE_USD}/month`} />
            )}
            {paymentsBypassed() ? <p className="mt-2 text-xs text-amber-700">Test mode: no payment is taken.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Credit history" />
        {history.length ? (
          <ul className="divide-y divide-slate-100">
            {history.map((t) => {
              const Icon = KIND_ICON[t.kind as keyof typeof KIND_ICON] ?? Coins;
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <Icon className="size-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-500">{timeAgo(t.createdAt)}</p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", t.amountMicros >= 0 ? "text-emerald-600" : "text-slate-700")}>
                    {t.amountMicros >= 0 ? "+" : ""}
                    {formatCredits(t.amountMicros)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No credit activity yet.</p>
        )}
      </Card>
    </>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      {children}
    </li>
  );
}
