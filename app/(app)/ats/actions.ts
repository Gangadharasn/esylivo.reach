"use server";

import { analyzeResume, type AtsResult } from "@/lib/ats";
import { requireUser } from "@/lib/auth";
import { buildResume } from "@/lib/outreach";
import { pdfText } from "@/lib/pdf-text";
import { prisma } from "@/lib/prisma";

export type AtsState = { error?: string; result?: AtsResult; parsedText?: string; resumeLabel?: string; jobLabel?: string } | undefined;

const MAX_UPLOAD = 5 * 1024 * 1024;

export async function runAtsAction(_: AtsState, formData: FormData): Promise<AtsState> {
  const user = await requireUser();
  const source = String(formData.get("source") ?? "mine");
  const jobId = String(formData.get("jobId") ?? "");
  const pasted = String(formData.get("jd") ?? "").trim().slice(0, 20_000);

  // The job to compare against: one of the user's saved jobs, pasted text, or none.
  const job = jobId && jobId !== "paste" && jobId !== "none" ? await prisma.jobPost.findFirst({ where: { id: jobId, userId: user.id } }) : null;
  const jobDescription = job ? `${job.jobTitle}\n${job.content}` : jobId === "paste" ? pasted : "";
  const jobTitle = job?.jobTitle ?? "";
  if (jobId === "paste" && pasted.length < 50) return { error: "Paste the full job description (at least a few lines)." };

  let bytes: Uint8Array;
  let resumeLabel: string;
  if (source === "upload") {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) return { error: "Choose your resume PDF to upload." };
    if (file.size > MAX_UPLOAD) return { error: "That file is over 5 MB." };
    bytes = new Uint8Array(await file.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return { error: "Please upload a PDF. (In Word: File → Save as → PDF.)" };
    resumeLabel = file.name;
  } else {
    // The user's Esylivo resume, tailored to the chosen job exactly as it would be emailed.
    const template = String(formData.get("template") || user.resumeTemplate);
    const { pdf } = await buildResume(user, { content: job?.content ?? "", jobTitle }, { template, useAi: false });
    bytes = new Uint8Array(pdf);
    resumeLabel = job ? "Your resume, tailored to this job" : "Your Esylivo resume";
  }

  let parsed: { pages: number; text: string };
  try {
    parsed = await pdfText(bytes);
  } catch (err) {
    console.error("[ats] pdf parse failed", err);
    return { error: "We couldn't read that PDF. It may be password-protected or damaged." };
  }

  return {
    result: analyzeResume({ text: parsed.text, pages: parsed.pages, jobDescription, jobTitle }),
    parsedText: parsed.text.slice(0, 6000),
    resumeLabel,
    jobLabel: job ? `${job.jobTitle || "Job"}${job.company || job.authorName ? ` · ${job.company || job.authorName}` : ""}` : jobId === "paste" ? "Pasted job description" : "",
  };
}
