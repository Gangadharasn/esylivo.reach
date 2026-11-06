import { ArrowLeft, Briefcase, ExternalLink, FileText, IndianRupee, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, MatchBadge, SourceBadge, StatusBadge } from "@/components/badges";
import { Card, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { draftEmail, smtpReady } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";
import { splitList } from "@/lib/profile";
import { matchJob } from "@/lib/skills";
import { sourceLabel } from "@/lib/sources";
import { timeAgo } from "@/lib/utils";

import { ApplyOnSite } from "./apply-on-site";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "Review job" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const post = await prisma.jobPost.findFirst({
    where: { id, userId: user.id },
    include: { applications: { orderBy: { createdAt: "desc" } } },
  });
  if (!post) notFound();

  const { matched, missing } = matchJob(post.content, splitList(user.skills));
  const draft = draftEmail(user, post);
  const emails = post.emails ? post.emails.split(",") : [];
  const phones = post.phones ? post.phones.split(",") : [];
  const site = sourceLabel(post.source);
  const siteUrl = post.applyUrl || post.url;
  const isBoard = post.source !== "LINKEDIN";

  return (
    <>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={post.authorName} src={post.authorAvatar} size={52} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{post.jobTitle || "Hiring post"}</h1>
            <div className="my-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <SourceBadge source={post.source} />
              {post.experience ? (
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3" /> {post.experience}
                </span>
              ) : null}
              {post.salary ? (
                <span className="flex items-center gap-1">
                  <IndianRupee className="size-3" /> {post.salary.replace(/^₹\s?/, "")}
                </span>
              ) : null}
              {post.location ? (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {post.location}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-500">
              {post.authorName}
              {post.authorHeadline ? ` · ${post.authorHeadline}` : ""}
              {post.postedAt ? ` · ${timeAgo(post.postedAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MatchBadge score={post.matchScore} />
          <StatusBadge status={post.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader
              title={isBoard ? "Job description" : "Job post"}
              action={
                post.url ? (
                  <a href={post.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                    Open on {site} <ExternalLink className="size-3.5" />
                  </a>
                ) : null
              }
            />
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-slate-700">{post.content}</p>
          </Card>

          <Card>
            <CardHeader
              title="Email to the recruiter"
              description={
                emails.length || !isBoard
                  ? "Edit anything before sending. Your tailored resume is attached automatically."
                  : `This listing has no recruiter email. Apply on ${site} instead, or add an email if you have one.`
              }
            />
            <div className="px-5 py-4">
              <Composer
                postId={post.id}
                emails={emails}
                subject={draft.subject}
                body={draft.body}
                canSend={smtpReady(user)}
                alreadySent={post.status === "SENT"}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {isBoard && siteUrl ? (
            <Card className="px-5 py-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Apply on {site}</p>
              <p className="mb-3 text-sm text-slate-600">
                {site} doesn&apos;t allow other apps to apply for you, so this opens the job on {site}. Apply there with your {site} account; we&apos;ll
                track it here.
              </p>
              <ApplyOnSite postId={post.id} url={siteUrl} site={site} applied={post.status === "APPLIED"} />
            </Card>
          ) : null}

          <Card className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
            {emails.length || phones.length ? (
              <div className="space-y-1.5 text-sm">
                {emails.map((e) => (
                  <a key={e} href={`mailto:${e}`} className="flex items-center gap-2 text-slate-700 hover:text-brand-600">
                    <Mail className="size-4 text-slate-400" /> {e}
                  </a>
                ))}
                {phones.map((p) => (
                  <a key={p} href={`tel:${p}`} className="flex items-center gap-2 text-slate-700 hover:text-brand-600">
                    <Phone className="size-4 text-slate-400" /> {p}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {isBoard ? `No email or phone in the listing. Apply on ${site}.` : "The post has no email or phone. Message them on LinkedIn instead."}
              </p>
            )}
            {post.authorUrl ? (
              <a href={post.authorUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                View {post.authorName.split(" ")[0] || "their"} profile <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </Card>

          <Card className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your match</p>
            {matched.length ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {matched.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    ✓ {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-slate-500">None of your profile skills appear in this post.</p>
            )}
            {missing.length ? (
              <>
                <p className="mb-1.5 text-xs text-slate-500">Asked for, not in your profile:</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((s) => (
                    <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {s}
                    </span>
                  ))}
                </div>
                <Link href="/profile" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline">
                  Have these? Add them to your profile →
                </Link>
              </>
            ) : null}
          </Card>

          <Card className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tailored resume</p>
            <p className="mb-3 text-sm text-slate-600">Rebuilt for this job: matching skills highlighted first, most relevant experience on top.</p>
            <a
              href={`/api/jobs/${post.id}/resume`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <FileText className="size-4 text-brand-600" /> Preview resume PDF
            </a>
            <Link href={`/ats?job=${post.id}`} className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              Check its ATS score for this job →
            </Link>
            <Link href={`/study?job=${post.id}`} className="mt-1 flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              Prepare for this interview →
            </Link>
          </Card>

          {post.applications.length ? (
            <Card className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <ul className="space-y-2 text-sm">
                {post.applications.map((a) => (
                  <li key={a.id}>
                    <span className={a.status === "SENT" ? "text-emerald-700" : "text-red-600"}>
                      {a.channel !== "EMAIL" ? `Applied on ${sourceLabel(a.channel)}` : a.status === "SENT" ? `Emailed ${a.toEmail}` : `Failed to email ${a.toEmail}`}
                    </span>{" "}
                    · {timeAgo(a.createdAt)}
                    {a.auto ? " · autopilot" : ""}
                    {a.error ? <p className="text-xs text-red-600">{a.error}</p> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
