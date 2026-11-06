import "server-only";

import nodemailer from "nodemailer";

import { aiSummary } from "@/lib/ai";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { toProfile, type Profile } from "@/lib/profile";
import { resumeFileName, resumePdf } from "@/lib/resume-pdf";
import { tailorResume } from "@/lib/tailor";
import { DEFAULT_BODY, DEFAULT_SUBJECT, renderEmail } from "@/lib/templates";

type User = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
type Post = NonNullable<Awaited<ReturnType<typeof prisma.jobPost.findUnique>>>;

// The same recruiter is not emailed again within this many days.
export const RECONTACT_DAYS = 30;

export function smtpReady(user: User) {
  return Boolean(user.smtpHost && user.smtpUser && user.smtpPass);
}

function profileText(p: Profile) {
  return [
    `${p.name}, ${p.headline}, ${p.yearsExperience} years`,
    `Skills: ${p.skills.join(", ")}`,
    p.summary,
    ...p.experience.map((e) => `${e.role} at ${e.company}: ${e.bullets.join("; ")}`),
    ...p.projects.map((pr) => `Project ${pr.name}: ${pr.description} (${pr.tech})`),
    ...p.education.map((e) => `${e.degree}, ${e.school} ${e.year}`),
  ].join("\n");
}

export async function buildResume(
  user: User,
  post: Pick<Post, "content" | "jobTitle">,
  { useAi = true, template = user.resumeTemplate }: { useAi?: boolean; template?: string } = {},
) {
  const profile = toProfile(user);
  const summary = useAi && post.content ? await aiSummary({ profileText: profileText(profile), job: post.content }) : null;
  const resume = tailorResume(profile, post, summary ?? undefined);
  return { resume, pdf: await resumePdf(resume, template), fileName: resumeFileName(profile.name) };
}

export function draftEmail(user: User, post: Post) {
  const profile = toProfile(user);
  const ctx = {
    posterName: post.authorName,
    jobTitle: post.jobTitle,
    matchedSkills: post.matchedSkills ? post.matchedSkills.split(",") : [],
    myName: profile.name,
    myHeadline: profile.headline,
    myPhone: profile.phone,
    myEmail: profile.email,
    myLinkedin: profile.linkedin,
    mySkills: profile.skills,
  };
  return {
    subject: renderEmail(user.emailSubject || DEFAULT_SUBJECT, ctx),
    body: renderEmail(user.emailBody || DEFAULT_BODY, ctx),
  };
}

export async function sentToday(userId: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  return prisma.application.count({ where: { userId, status: "SENT", createdAt: { gte: since } } });
}

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Emails the tailored resume to the post's recruiter and records the attempt.
 * Enforces the daily limit and skips recruiters already contacted recently.
 */
export async function sendApplication(
  user: User,
  post: Post,
  opts: { to?: string; subject?: string; body?: string; auto?: boolean } = {},
): Promise<SendResult> {
  const to = (opts.to || post.emails.split(",")[0] || "").trim().toLowerCase();
  if (!to) return { ok: false, error: "This post has no email address." };
  if (!smtpReady(user)) return { ok: false, error: "Connect your email in Settings first." };
  if ((await sentToday(user.id)) >= user.dailyLimit) {
    return { ok: false, error: `Daily limit of ${user.dailyLimit} emails reached. It resets at midnight.` };
  }
  const since = new Date(Date.now() - RECONTACT_DAYS * 86_400_000);
  const recent = await prisma.application.findFirst({
    where: { userId: user.id, toEmail: to, status: "SENT", createdAt: { gte: since } },
  });
  if (recent) return { ok: false, error: `You already emailed ${to} in the last ${RECONTACT_DAYS} days.` };

  const draft = draftEmail(user, post);
  const subject = opts.subject?.trim() || draft.subject;
  const body = opts.body?.trim() || draft.body;

  try {
    const { pdf, fileName } = await buildResume(user, post);
    const transport = nodemailer.createTransport({
      host: user.smtpHost,
      port: user.smtpPort,
      secure: user.smtpPort === 465,
      auth: { user: user.smtpUser, pass: decrypt(user.smtpPass) },
    });
    await transport.sendMail({
      from: { name: user.fromName || user.name, address: user.smtpUser },
      replyTo: user.email !== user.smtpUser ? user.email : undefined,
      to,
      subject,
      text: body,
      attachments: [{ filename: fileName, content: pdf, contentType: "application/pdf" }],
    });
    await prisma.$transaction([
      prisma.application.create({ data: { userId: user.id, postId: post.id, toEmail: to, subject, body, status: "SENT", auto: Boolean(opts.auto) } }),
      prisma.jobPost.update({ where: { id: post.id }, data: { status: "SENT" } }),
    ]);
    return { ok: true };
  } catch (err) {
    const error = friendlySmtpError(err);
    await prisma.$transaction([
      prisma.application.create({
        data: { userId: user.id, postId: post.id, toEmail: to, subject, body, status: "FAILED", error, auto: Boolean(opts.auto) },
      }),
      prisma.jobPost.update({ where: { id: post.id }, data: { status: "FAILED" } }),
    ]);
    return { ok: false, error };
  }
}

function friendlySmtpError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (/Invalid login|Username and Password not accepted|535/i.test(message)) {
    return "Email login failed. For Gmail, use an App Password (Google Account → Security → App passwords).";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(message)) return "Couldn't reach the email server. Check the SMTP host and port.";
  return `Email failed: ${message.slice(0, 200)}`;
}

/** Sends to every new post that has an email and meets the user's match threshold, up to the daily limit. */
export async function autoSend(user: User, postIds?: string[]) {
  const posts = await prisma.jobPost.findMany({
    where: {
      userId: user.id,
      status: "NEW",
      emails: { not: "" },
      matchScore: { gte: user.minMatch },
      ...(postIds ? { id: { in: postIds } } : {}),
    },
    orderBy: { matchScore: "desc" },
    take: 100,
  });
  let sent = 0;
  for (const post of posts) {
    if ((await sentToday(user.id)) >= user.dailyLimit) break;
    const result = await sendApplication(user, post, { auto: true });
    if (result.ok) {
      sent++;
    } else if (result.error.startsWith("You already emailed")) {
      await prisma.jobPost.update({ where: { id: post.id }, data: { status: "SKIPPED" } });
    } else if (!result.error.startsWith("Email failed")) {
      break; // login, connection or limit problems will fail for every post
    }
  }
  return sent;
}
