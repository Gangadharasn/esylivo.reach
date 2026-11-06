import { ArrowRight, Briefcase, CheckCircle2, Circle, Mail, Send, SlidersHorizontal, Target, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar, MatchBadge } from "@/components/badges";
import { SearchStatus } from "@/components/search-status";
import { ButtonLink, Card, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { sentToday, smtpReady } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";
import { profileGaps, toProfile } from "@/lib/profile";
import { formatCredits } from "@/lib/pricing";
import { searchKeywords, searchStatusProps } from "@/lib/search";
import { sourceLabel } from "@/lib/sources";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [total, withEmail, strong, sentWeek, todayCount, topNew, recent] = await Promise.all([
    prisma.jobPost.count({ where: { userId: user.id } }),
    prisma.jobPost.count({ where: { userId: user.id, emails: { not: "" } } }),
    prisma.jobPost.count({ where: { userId: user.id, status: "NEW", matchScore: { gte: 70 } } }),
    prisma.application.count({ where: { userId: user.id, status: "SENT", createdAt: { gte: weekAgo } } }),
    sentToday(user.id),
    prisma.jobPost.findMany({
      where: { userId: user.id, status: "NEW" },
      orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
      take: 6,
    }),
    prisma.application.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6, include: { post: true } }),
  ]);

  const gaps = profileGaps(toProfile(user));
  const setup = [
    { done: gaps.length === 0, label: "Complete your profile", href: "/profile" },
    { done: searchKeywords(user).length > 0, label: "Choose job keywords", href: "/jobs" },
    { done: smtpReady(user), label: "Connect your email", href: "/settings" },
    { done: user.autoSend, label: "Turn on auto-apply", href: "/settings#autopilot" },
  ];
  const setupDone = setup.every((s) => s.done);

  const doneCount = setup.filter((s) => s.done).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-800 to-fuchsia-700 p-6 text-white shadow-xl shadow-brand-900/20 sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-200">
              {greeting}, {user.name.split(" ")[0]} 👋
            </p>
            <h1 className="mt-1.5 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
              {strong ? `${strong} strong match${strong === 1 ? "" : "es"} waiting for your application` : "Let's find your next role"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-brand-100/80">
              {strong
                ? "These jobs match 70% or more of your skills. Review them and apply with a tailored resume in one click."
                : "We search LinkedIn, Naukri, Indeed and Foundit for you, then tailor your resume to every job we find."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/jobs" className="bg-white text-brand-700 shadow-lg shadow-black/10 hover:bg-brand-50">
                <Briefcase className="size-4" /> Review jobs
              </ButtonLink>
              <ButtonLink href="/jobs" variant="secondary" className="border-white/25 bg-white/10 text-white shadow-none hover:border-white/40 hover:bg-white/20">
                <SlidersHorizontal className="size-4" /> Job keywords
              </ButtonLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3 lg:w-80">
            {[
              ["Found", total],
              ["Strong", strong],
              ["Sent", sentWeek],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-2 py-3 ring-1 ring-white/15 backdrop-blur">
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-brand-200">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SearchStatus {...searchStatusProps(user)} />
      </div>

      {!setupDone ? (
        <Card className="mb-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold tracking-tight text-slate-900">Finish setting up</h2>
              <p className="text-sm text-slate-500">Four quick steps and Esylivo Reach runs on its own.</p>
            </div>
            <span className="text-sm font-semibold text-brand-700">
              {doneCount} of {setup.length} done
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 transition-all" style={{ width: `${(doneCount / setup.length) * 100}%` }} />
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {setup.map((s, i) => (
              <Link
                key={s.label}
                href={s.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm ring-1 transition-colors",
                  s.done ? "bg-slate-50 ring-slate-100" : "bg-white ring-slate-200 hover:bg-brand-50/50 hover:ring-brand-200",
                )}
              >
                {s.done ? (
                  <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
                ) : (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
                )}
                <span className={cn("flex-1", s.done ? "text-slate-400 line-through" : "font-medium text-slate-800")}>{s.label}</span>
                {!s.done ? <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" /> : null}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={Briefcase} tone="violet" label="Jobs found" value={total} hint="Across all job sites" />
        <Stat icon={Mail} tone="sky" label="With recruiter email" value={withEmail} hint={total ? `${Math.round((withEmail / total) * 100)}% of all jobs` : undefined} />
        <Stat icon={Send} tone="emerald" label="Sent this week" value={sentWeek} hint={`${todayCount}/${user.dailyLimit} sent today`} />
        <Stat icon={Zap} tone="amber" label="Search credits" value={formatCredits(user.creditMicros)} hint={user.plan === "PRO" ? "Pro plan" : "Free plan · upgrade for more"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Best new matches"
            description="Jobs you haven't applied to yet"
            action={
              <Link href="/jobs" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                All <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {topNew.length ? (
            <ul className="divide-y divide-slate-100">
              {topNew.map((p) => (
                <li key={p.id}>
                  <Link href={`/jobs/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar name={p.authorName} src={p.authorAvatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{p.jobTitle || p.content.slice(0, 60)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.authorName} · {p.emails ? p.emails.split(",")[0] : sourceLabel(p.source)}
                      </p>
                    </div>
                    <MatchBadge score={p.matchScore} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Target} text="Matching hiring posts appear here after your first automatic search." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent applications"
            action={
              <Link href="/applications" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                All <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {recent.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  {a.status === "SENT" ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-red-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{a.post.jobTitle || a.subject}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.channel === "EMAIL" ? a.toEmail : `Applied on ${sourceLabel(a.channel)}`} · {timeAgo(a.createdAt)}
                      {a.auto ? " · autopilot" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Send} text="Applications you send will show up here." />
          )}
        </Card>
      </div>
    </>
  );
}

const TONES = {
  violet: "bg-brand-50 text-brand-600 ring-brand-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
};

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Mail; label: string; value: number | string; hint?: string; tone: keyof typeof TONES }) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-lift sm:p-5">
      <span className={cn("flex size-10 items-center justify-center rounded-xl ring-1", TONES[tone])}>
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-600">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Mail; text: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-fuchsia-50 ring-1 ring-brand-100">
        <Icon className="size-6 text-brand-500" />
      </span>
      <p className="mt-3 max-w-xs text-sm text-slate-500">{text}</p>
    </div>
  );
}
