"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireUser } from "@/lib/auth";
import { sendApplication } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";
import { affordableResults, claimSearch, runSearch, searchAvailable } from "@/lib/search";
import { parseSources } from "@/lib/sources";
import { fieldErrors, preferencesSchema } from "@/lib/validators";

export type PreferencesState = { errors?: Record<string, string>; saved?: boolean } | undefined;

function refresh() {
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/applications");
}

/** Starts a search in the background; the page shows progress and refreshes when it finishes. */
async function startSearch(userId: string) {
  if (!searchAvailable()) return { error: "Job search is temporarily unavailable. Please try again later." };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !affordableResults(user)) return { error: "You're out of credits. Upgrade to Pro to keep searching." };
  if (!(await claimSearch(userId))) return { error: "A search is already running." };
  after(() => runSearch(userId));
  refresh();
  return { started: true };
}

export async function searchNowAction() {
  const user = await requireUser();
  return startSearch(user.id);
}

export async function savePreferencesAction(_: PreferencesState, formData: FormData): Promise<PreferencesState> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const sources = parseSources(formData.getAll("jobSources").map(String).join(","));
  if (!sources.length) return { errors: { jobSources: "Choose at least one job site" } };
  const { jobKeywords, ...rest } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: { ...rest, jobKeywords: jobKeywords.join("\n"), jobSources: sources.join(",") },
  });
  // Search straight away with the new preferences.
  await startSearch(user.id);
  return { saved: true };
}

export async function sendAction(postId: string, input: { to?: string; subject?: string; body?: string } = {}) {
  const user = await requireUser();
  const post = await prisma.jobPost.findFirst({ where: { id: postId, userId: user.id } });
  if (!post) return { ok: false as const, error: "Post not found" };
  const result = await sendApplication(user, post, input);
  refresh();
  revalidatePath(`/jobs/${postId}`);
  return result;
}

/**
 * Records that the user applied on the job site itself (Naukri, Indeed, Foundit or LinkedIn).
 * Those sites have no apply API, so the app opens the listing and the user applies there.
 */
export async function markAppliedOnSiteAction(postId: string) {
  const user = await requireUser();
  const post = await prisma.jobPost.findFirst({ where: { id: postId, userId: user.id } });
  if (!post) return;
  await prisma.$transaction([
    prisma.application.create({
      data: { userId: user.id, postId: post.id, channel: post.source, subject: post.jobTitle, status: "SENT" },
    }),
    prisma.jobPost.update({ where: { id: post.id }, data: { status: "APPLIED" } }),
  ]);
  refresh();
  revalidatePath(`/jobs/${postId}`);
}

export async function bulkSendAction(ids: string[]) {
  const user = await requireUser();
  const posts = await prisma.jobPost.findMany({ where: { id: { in: ids.slice(0, 100) }, userId: user.id }, orderBy: { matchScore: "desc" } });
  let sent = 0;
  const errors: string[] = [];
  for (const post of posts) {
    const result = await sendApplication(user, post);
    if (result.ok) sent++;
    else {
      errors.push(`${post.authorName || "Post"}: ${result.error}`);
      if (/Daily limit|Connect your email|login failed|Couldn't reach/.test(result.error)) break;
    }
  }
  refresh();
  return { sent, errors };
}

export async function setStatusAction(ids: string[], status: "NEW" | "SKIPPED") {
  const user = await requireUser();
  await prisma.jobPost.updateMany({ where: { id: { in: ids }, userId: user.id }, data: { status } });
  refresh();
}

export async function deletePostsAction(ids: string[]) {
  const user = await requireUser();
  await prisma.jobPost.deleteMany({ where: { id: { in: ids }, userId: user.id } });
  refresh();
}
