import { firstName } from "@/lib/extract";
import { listJoin } from "@/lib/tailor";

export const DEFAULT_SUBJECT = "Application for {job_title} — {my_name}";

export const DEFAULT_BODY = `Hi {poster_first_name},

I came across your LinkedIn post about the {job_title} opening and I'd love to be considered.

I'm a {my_headline} with hands-on experience in {matched_skills}, which lines up well with what you described. I've attached my resume for your review.

I'd be glad to share more or set up a quick call at your convenience.

Thanks and regards,
{my_name}
{my_phone}
{my_linkedin}`;

export const EMAIL_VARIABLES = [
  "{poster_name}",
  "{poster_first_name}",
  "{job_title}",
  "{matched_skills}",
  "{my_name}",
  "{my_headline}",
  "{my_phone}",
  "{my_email}",
  "{my_linkedin}",
];

export type EmailContext = {
  posterName: string;
  jobTitle: string;
  matchedSkills: string[];
  myName: string;
  myHeadline: string;
  myPhone: string;
  myEmail: string;
  myLinkedin: string;
  mySkills: string[];
};

export function renderEmail(template: string, ctx: EmailContext) {
  const values: Record<string, string> = {
    poster_name: ctx.posterName || "there",
    poster_first_name: firstName(ctx.posterName) || "there",
    job_title: ctx.jobTitle || "open position",
    matched_skills: listJoin((ctx.matchedSkills.length ? ctx.matchedSkills : ctx.mySkills).slice(0, 5)) || "my field",
    my_name: ctx.myName,
    my_headline: ctx.myHeadline || "professional",
    my_phone: ctx.myPhone,
    my_email: ctx.myEmail,
    my_linkedin: ctx.myLinkedin,
  };
  return template
    .replace(/\{(\w+)\}/g, (match, key: string) => values[key.toLowerCase()] ?? match)
    .replace(/the open position opening/g, "the open position")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
