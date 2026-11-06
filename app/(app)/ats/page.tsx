import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sourceLabel } from "@/lib/sources";

import { AtsChecker } from "./ats-checker";

export const metadata: Metadata = { title: "ATS check" };

export default async function AtsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser();
  const { job } = await searchParams;
  const jobs = await prisma.jobPost.findMany({
    where: { userId: user.id, status: { not: "SKIPPED" } },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: 50,
    select: { id: true, jobTitle: true, company: true, authorName: true, source: true },
  });

  return (
    <>
      <PageHeader title="ATS check" description="Most companies filter resumes with software before a person reads them. Check yours passes, for free." />
      <AtsChecker
        template={user.resumeTemplate}
        defaultJob={jobs.some((j) => j.id === job) ? job! : ""}
        jobs={jobs.map((j) => ({
          id: j.id,
          label: `${j.jobTitle || "Hiring post"} · ${j.company || j.authorName || "Unknown"} (${sourceLabel(j.source)})`.slice(0, 90),
        }))}
      />
    </>
  );
}
