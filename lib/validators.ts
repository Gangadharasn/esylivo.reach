import { z } from "zod";

import { POSTED_LIMITS } from "@/lib/apify";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const preferencesSchema = z.object({
  jobKeywords: z
    .string()
    .max(1000)
    .transform((v) => v.split(/[,\n]/).map((q) => q.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(120)).max(5, "Use at most 5 keyword searches")),
  jobLocation: z.string().trim().max(80),
  postedLimit: z.enum(POSTED_LIMITS),
  postsPerQuery: z.coerce.number().int().min(5, "At least 5").max(50, "At most 50"),
  jobsOnly: z.literal("on").optional().transform(Boolean),
  autoSearch: z.literal("on").optional().transform(Boolean),
});

const text = (max: number) => z.string().trim().max(max).default("");

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  headline: text(120),
  phone: text(30),
  location: text(100),
  linkedin: text(300),
  website: text(300),
  summary: text(1500),
  yearsExperience: z.coerce.number().int().min(0).max(60).default(0),
  skills: z.array(z.string().trim().max(60)).max(80),
  certifications: z.array(z.string().trim().max(200)).max(30),
  experience: z
    .array(
      z.object({
        role: text(120),
        company: text(120),
        start: text(30),
        end: text(30),
        bullets: z.array(z.string().trim().max(400)).max(12),
      }),
    )
    .max(15),
  education: z.array(z.object({ degree: text(150), school: text(150), year: text(30), score: text(40) })).max(10),
  projects: z.array(z.object({ name: text(120), description: text(600), tech: text(200) })).max(15),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const settingsSchema = z.object({
  smtpHost: z.string().trim().max(200),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().trim().max(200),
  smtpPass: z.string().max(200).optional(),
  fromName: z.string().trim().max(100),
  emailSubject: z.string().trim().max(200),
  emailBody: z.string().trim().max(5000),
  dailyLimit: z.coerce.number().int().min(1, "At least 1").max(100, "Keep it at 100 or fewer to protect your email account"),
  minMatch: z.coerce.number().int().min(0).max(100),
  autoSend: z.literal("on").optional().transform(Boolean),
});

/** First error message per field, for showing under form inputs. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
