import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { aiEnabled } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitList } from "@/lib/profile";
import { bankQuestions, topicsForJob, topicsForSkills, type StudyQuestionView } from "@/lib/study";
import { TOPICS } from "@/lib/study/bank";
import { timeAgo } from "@/lib/utils";

import { StudyHub } from "./study-hub";

export const metadata: Metadata = { title: "Interview prep" };

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ tab?: string; job?: string }> }) {
  const user = await requireUser();
  const { tab, job } = await searchParams;

  const [marks, custom, mocks, jobs] = await Promise.all([
    prisma.studyMark.findMany({ where: { userId: user.id }, select: { questionId: true, status: true } }),
    prisma.studyQuestion.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.mockInterview.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.jobPost.findMany({
      where: { userId: user.id, status: { not: "SKIPPED" } },
      orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
      take: 30,
      select: { id: true, jobTitle: true, company: true, authorName: true, content: true },
    }),
  ]);

  const customQuestions: StudyQuestionView[] = custom.map((c) => ({
    id: c.id,
    topicId: `custom:${c.topic}`,
    topicName: c.topic,
    q: c.question,
    a: c.answer,
    points: safeList(c.points),
    level: (c.level as 1 | 2 | 3) ?? 2,
    custom: true,
  }));
  const customTopics = [...new Set(custom.map((c) => c.topic))].map((name) => ({ id: `custom:${name}`, name }));

  // "For you": the profile's skills first, then topics several of the user's jobs ask for.
  // Capped so the list stays focused; HR & Behavioural is always included.
  const fromProfile = topicsForSkills(splitList(user.skills)).filter((t) => t !== "hr");
  const jobCounts = new Map<string, number>();
  for (const j of jobs.slice(0, 15)) for (const t of topicsForJob(`${j.jobTitle}\n${j.content}`)) if (t !== "hr") jobCounts.set(t, (jobCounts.get(t) ?? 0) + 1);
  const fromJobs = [...jobCounts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const suggested = [...new Set([...fromProfile, ...fromJobs])].slice(0, 5).concat("hr");

  return (
    <>
      <PageHeader
        title="Interview prep"
        description="Interview questions with model answers for your skills and jobs, plus mock interviews with instant feedback."
      />
      <StudyHub
        initialTab={tab === "mock" ? "mock" : "questions"}
        initialJob={jobs.some((j) => j.id === job) ? job! : ""}
        questions={[...bankQuestions(), ...customQuestions]}
        topics={[...TOPICS.map((t) => ({ id: t.id, name: t.name })), ...customTopics]}
        suggested={suggested}
        marks={Object.fromEntries(marks.map((m) => [m.questionId, m.status]))}
        jobs={jobs.map((j) => ({
          id: j.id,
          label: `${j.jobTitle || "Hiring post"} · ${j.company || j.authorName || "Unknown"}`.slice(0, 80),
          topics: topicsForJob(`${j.jobTitle}\n${j.content}`),
        }))}
        mocks={mocks.map((m) => ({ id: m.id, title: m.title, score: m.score, when: timeAgo(m.createdAt), count: safeList(m.results).length }))}
        aiEnabled={aiEnabled()}
      />
    </>
  );
}

function safeList(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
