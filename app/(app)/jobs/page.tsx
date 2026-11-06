import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SearchStatus } from "@/components/search-status";
import { Card, Input, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { smtpReady } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";
import { formatCredits } from "@/lib/pricing";
import { searchCostEstimate, searchKeywords, searchStatusProps } from "@/lib/search";
import { parseSources, SOURCE_KEYS, SOURCES } from "@/lib/sources";
import { cn, timeAgo } from "@/lib/utils";

import { JobsTable } from "./jobs-table";
import { PreferencesForm } from "./preferences-form";

export const metadata: Metadata = { title: "Jobs" };

const STATUS_TABS = [
  { key: "new", label: "To apply" },
  { key: "sent", label: "Applied" },
  { key: "skipped", label: "Skipped" },
  { key: "all", label: "All" },
];

const CONTACT_FILTERS = [
  { key: "any", label: "Any contact" },
  { key: "email", label: "Has email" },
  { key: "phone", label: "Has mobile no." },
  { key: "both", label: "Email + mobile" },
  { key: "none", label: "No contact" },
];

const FILTER_SELECT = "min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm sm:py-2";

type Params ={ status?: string; contact?: string; source?: string; q?: string; min?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const params = await searchParams;
  const status = STATUS_TABS.some((t) => t.key === params.status) ? params.status! : "new";
  const contact = CONTACT_FILTERS.some((c) => c.key === params.contact) ? params.contact! : "any";
  const source = (SOURCE_KEYS as readonly string[]).includes(params.source ?? "") ? params.source! : "any";
  const minScore = Math.max(0, Math.min(100, Number(params.min) || 0));
  const query = (params.q ?? "").trim();

  const statusWhere =
    status === "new" ? { status: { in: ["NEW", "FAILED"] } } : status === "sent" ? { status: { in: ["SENT", "APPLIED"] } } : status === "skipped" ? { status: "SKIPPED" } : {};
  const hasEmail = { emails: { not: "" } };
  const hasPhone = { phones: { not: "" } };
  const contactWhere =
    contact === "email"
      ? hasEmail
      : contact === "phone"
        ? hasPhone
        : contact === "both"
          ? { AND: [hasEmail, hasPhone] }
          : contact === "none"
            ? { emails: "", phones: "" }
            : {};

  const posts = await prisma.jobPost.findMany({
    where: {
      userId: user.id,
      ...statusWhere,
      ...contactWhere,
      ...(source !== "any" ? { source } : {}),
      matchScore: { gte: minScore },
      ...(query ? { OR: (["content", "authorName", "jobTitle", "company"] as const).map((f) => ({ [f]: { contains: query, mode: "insensitive" as const } })) } : {}),
    },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: 300,
  });

  const link = (patch: Partial<Params>) => ({
    pathname: "/jobs",
    query: Object.fromEntries(
      Object.entries({ status, contact, source, q: query, min: minScore ? String(minScore) : "", ...patch }).filter(([, v]) => v && v !== "any"),
    ),
  });

  return (
    <>
      <PageHeader title="Jobs" description="Jobs found for you on LinkedIn, Naukri, Indeed and Foundit, best matches first. New ones are added automatically." />

      <div className="mb-6 space-y-3">
        <SearchStatus {...searchStatusProps(user)} />
        <PreferencesForm
          openByDefault={!user.lastSearchAt && !searchKeywords(user).length}
          p={{
            jobKeywords: user.jobKeywords,
            suggested: searchKeywords({ ...user, jobKeywords: "" }).join("\n") || "react developer\nnode.js developer",
            jobLocation: user.jobLocation,
            postedLimit: user.postedLimit,
            postsPerQuery: user.postsPerQuery,
            jobsOnly: user.jobsOnly,
            autoSearch: user.autoSearch,
            jobSources: parseSources(user.jobSources),
            costEstimate: formatCredits(searchCostEstimate(user)),
            credits: formatCredits(user.creditMicros),
          }}
        />
      </div>

      {!smtpReady(user) ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          To apply by email, <Link href="/settings" className="font-medium underline">connect your email account</Link> in Settings.
        </p>
      ) : !user.autoSend ? (
        <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Want it fully hands-free? Turn on <Link href="/settings#autopilot" className="font-medium underline">auto-apply</Link> and new matches get
          your tailored resume automatically.
        </p>
      ) : null}

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.key}
              href={link({ status: t.key })}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium sm:px-3 sm:py-1.5",
                status === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <input type="hidden" name="status" value={status} />
          <div className="relative col-span-3 sm:order-last sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={query} placeholder="Search jobs" className="pl-9" />
          </div>
          <select name="contact" defaultValue={contact} className={FILTER_SELECT} aria-label="Contact details">
            {CONTACT_FILTERS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={source} className={FILTER_SELECT} aria-label="Job site">
            <option value="any">All sites</option>
            {SOURCE_KEYS.map((k) => (
              <option key={k} value={k}>
                {SOURCES[k].label}
              </option>
            ))}
          </select>
          <select name="min" defaultValue={String(minScore)} className={FILTER_SELECT} aria-label="Minimum match">
            {[0, 30, 50, 70].map((m) => (
              <option key={m} value={m}>
                {m ? `${m}%+ match` : "Any match"}
              </option>
            ))}
          </select>
          <button className="col-span-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white sm:order-last sm:py-2">Filter</button>
        </form>
      </div>

      <Card className="overflow-hidden">
        <JobsTable
          canSend={smtpReady(user)}
          rows={posts.map((p) => ({
            id: p.id,
            source: p.source,
            url: p.url,
            applyUrl: p.applyUrl,
            location: p.location,
            experience: p.experience,
            salary: p.salary,
            content: p.content,
            authorName: p.authorName,
            authorHeadline: p.authorHeadline,
            authorUrl: p.authorUrl,
            authorAvatar: p.authorAvatar,
            postedAgo: p.postedAt ? timeAgo(p.postedAt) : "",
            jobTitle: p.jobTitle,
            emails: p.emails ? p.emails.split(",") : [],
            phones: p.phones ? p.phones.split(",") : [],
            matchedSkills: p.matchedSkills ? p.matchedSkills.split(",") : [],
            matchScore: p.matchScore,
            status: p.status,
          }))}
        />
      </Card>
      <p className="mt-2 text-xs text-slate-400">
        {posts.length} post{posts.length === 1 ? "" : "s"} shown{posts.length === 300 ? " (first 300)" : ""}.
      </p>
    </>
  );
}
