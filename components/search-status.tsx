"use client";

import { AlertCircle, CheckCircle2, Coins, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { searchNowAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SearchStatusProps = {
  status: string;
  error: string;
  lastSearch: string | null;
  found: number;
  added: number;
  queries: string[];
  sources: string[];
  autoSearch: boolean;
  credits: string;
  outOfCredits: boolean;
  nextIn: string | null;
};

/** Live banner for the background job search; refreshes the page while a search runs. */
export function SearchStatus(s: SearchStatusProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const running = s.status === "running";

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [running, router]);

  if (s.outOfCredits && !running) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Coins className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">You&apos;re out of search credits ({s.credits} left)</p>
            <p>Automatic job search is paused. Upgrade to Pro to keep finding new jobs. Your saved jobs and applications stay here.</p>
          </div>
        </div>
        <Link href="/billing" className="shrink-0 rounded-lg bg-gradient-to-r from-brand-600 to-fuchsia-600 px-4 py-2 text-center font-medium text-white">
          Upgrade
        </Link>
      </div>
    );
  }

  const searchNow = () =>
    start(async () => {
      const r = await searchNowAction();
      setMessage("error" in r && r.error ? r.error : null);
      router.refresh();
    });

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        running ? "bg-gradient-to-r from-brand-600 to-fuchsia-600 text-white" : s.status === "error" ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-white ring-1 ring-slate-200",
      )}
    >
      <div className="flex items-start gap-3">
        {running ? (
          <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" />
        ) : s.status === "error" ? (
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
        ) : s.lastSearch ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
        ) : (
          <Sparkles className="mt-0.5 size-5 shrink-0 text-fuchsia-500" />
        )}
        <div>
          {running ? (
            <>
              <p className="font-medium">Searching {listText(s.sources) || "job sites"} for new jobs…</p>
              <p className="text-brand-100">{s.queries.join("  ·  ")}. This takes a minute or two; results appear here automatically.</p>
            </>
          ) : s.status === "error" ? (
            <>
              <p className="font-medium">The last search didn&apos;t finish</p>
              <p>{s.error}</p>
            </>
          ) : s.lastSearch ? (
            <>
              <p className="font-medium text-slate-900">
                Last searched {s.lastSearch}: {s.found} jobs, <span className="text-brand-700">{s.added} new</span>
              </p>
              {s.error ? <p className="text-amber-700">{s.error}</p> : null}
              <p className="text-slate-500">
                {s.autoSearch ? `Searching automatically every few hours${s.nextIn ? `, next ${s.nextIn}` : ""}.` : "Automatic search is off."} Keywords:{" "}
                {s.queries.join(" · ") || "none yet"}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-900">Your first search starts automatically</p>
              <p className="text-slate-500">{s.queries.length ? `We'll look for: ${s.queries.join(" · ")}` : "Add job keywords below, or a headline and skills to your profile."}</p>
            </>
          )}
          {message ? <p className="mt-1 font-medium">{message}</p> : null}
        </div>
      </div>
      {!running ? (
        <Button variant={s.status === "error" ? "secondary" : "gradient"} onClick={searchNow} disabled={pending || !s.queries.length} className="shrink-0">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Search now
        </Button>
      ) : null}
    </div>
  );
}

function listText(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
