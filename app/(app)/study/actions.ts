"use server";

import { revalidatePath } from "next/cache";

import { aiEnabled } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAnswer, type Grade } from "@/lib/study";
import { aiFeedback, generateQuestions } from "@/lib/study/ai";

export async function markQuestionAction(questionId: string, status: "KNOWN" | "REVIEW" | "NONE") {
  const user = await requireUser();
  if (status === "NONE") {
    await prisma.studyMark.deleteMany({ where: { userId: user.id, questionId } });
  } else {
    await prisma.studyMark.upsert({
      where: { userId_questionId: { userId: user.id, questionId } },
      create: { userId: user.id, questionId, status },
      update: { status },
    });
  }
  revalidatePath("/study");
}

/** AI questions for a keyword or one of the user's jobs; saved so they appear in the list and mocks. */
export async function generateAction(subject: { keyword?: string; jobId?: string }) {
  const user = await requireUser();
  if (!aiEnabled()) return { error: "AI question generation isn't set up on this server." };

  let topic = (subject.keyword ?? "").trim();
  let prompt = topic;
  if (subject.jobId) {
    const job = await prisma.jobPost.findFirst({ where: { id: subject.jobId, userId: user.id } });
    if (!job) return { error: "Job not found." };
    topic = job.jobTitle || "This job";
    prompt = `${job.jobTitle} at ${job.company || job.authorName}\n${job.content}`;
  }
  if (topic.length < 2) return { error: "Type a skill or topic first." };

  // A light per-user limit, since generation uses the server's AI model.
  const since = new Date(Date.now() - 86_400_000);
  if ((await prisma.studyQuestion.count({ where: { userId: user.id, createdAt: { gte: since } } })) >= 80) {
    return { error: "Daily limit for AI questions reached. Try again tomorrow." };
  }

  try {
    const questions = await generateQuestions(prompt);
    if (!questions.length) return { error: "The AI didn't return usable questions. Try a more specific topic." };
    await prisma.studyQuestion.createMany({
      data: questions.map((q) => ({
        userId: user.id,
        topic: topic.slice(0, 80),
        question: q.question,
        answer: q.answer,
        points: JSON.stringify(q.points),
        level: q.level,
      })),
    });
    revalidatePath("/study");
    return { added: questions.length, topic };
  } catch (err) {
    console.error("[study] generate failed", err);
    return { error: "Couldn't generate questions right now. Please try again." };
  }
}

export async function deleteCustomTopicAction(topic: string) {
  const user = await requireUser();
  await prisma.studyQuestion.deleteMany({ where: { userId: user.id, topic } });
  revalidatePath("/study");
}

/** Scores one mock answer: key-point coverage, with AI interviewer feedback when available. */
export async function gradeAction(input: { question: string; modelAnswer: string; points: string[]; answer: string }): Promise<Grade & { ai: boolean }> {
  await requireUser();
  const grade = gradeAnswer(input.answer, input.points);
  const ai = await aiFeedback(input.question, input.modelAnswer, input.answer);
  // Blend: key-point coverage keeps scores comparable; AI judges explanation quality.
  return ai ? { ...grade, score: Math.round(grade.score * 0.5 + ai.score * 0.5), feedback: ai.feedback, ai: true } : { ...grade, ai: false };
}

export type MockResult = { questionId: string; question: string; answer: string; score: number; covered: string[]; missed: string[] };

export async function saveMockAction(title: string, results: MockResult[]) {
  const user = await requireUser();
  if (!results.length) return;
  const score = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  await prisma.mockInterview.create({
    data: { userId: user.id, title: title.slice(0, 120), score, results: JSON.stringify(results).slice(0, 100_000) },
  });
  revalidatePath("/study");
}
