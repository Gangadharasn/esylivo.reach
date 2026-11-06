import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sourceLabel } from "@/lib/sources";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const user = await requireUser();
  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { post: { select: { id: true, jobTitle: true, authorName: true, source: true } } },
  });

  return (
    <>
      <PageHeader title="Applications" description="Every application: emails sent with your tailored resume, and jobs you applied to on Naukri, Indeed, Foundit or LinkedIn." />
      <Card className="overflow-hidden">
        {apps.length ? (
          <>
          {/* Phones: one card per application. */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {apps.map((a) => {
              const ok = a.status === "SENT";
              return (
                <li key={a.id}>
                  <Link href={`/jobs/${a.post.id}`} className="flex items-start gap-3 px-4 py-3.5 active:bg-slate-50">
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{a.post.jobTitle || "Hiring post"}</p>
                      <p className="truncate text-xs text-slate-500">
                        {a.post.authorName} · {sourceLabel(a.post.source)}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-700">
                        {a.channel === "EMAIL" ? `Emailed ${a.toEmail}` : `Applied on ${sourceLabel(a.channel)}`}
                      </p>
                      {a.error ? <p className="mt-1 text-xs text-red-600">{a.error}</p> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-slate-500">{timeAgo(a.createdAt)}</p>
                      {a.auto ? <span className="mt-1 inline-block rounded-full bg-fuchsia-50 px-2 py-0.5 text-[11px] text-fuchsia-700">auto</span> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Applied via</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${a.post.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {a.post.jobTitle || "Hiring post"}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {a.post.authorName} · {sourceLabel(a.post.source)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.channel === "EMAIL" ? `Email to ${a.toEmail}` : `${sourceLabel(a.channel)} website`}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">{a.channel === "EMAIL" ? a.subject : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", a.status === "SENT" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                        {a.status !== "SENT" ? "Failed" : a.channel === "EMAIL" ? "Sent" : "Applied"}
                      </span>
                      {a.auto ? <span className="ml-1.5 rounded-full bg-fuchsia-50 px-2 py-0.5 text-xs text-fuchsia-700">autopilot</span> : null}
                      {a.error ? <p className="mt-1 max-w-xs text-xs text-red-600">{a.error}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{timeAgo(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <p className="px-5 py-16 text-center text-sm text-slate-500">No applications yet. Open Jobs and click Email or Apply on a job.</p>
        )}
      </Card>
    </>
  );
}
