// Builds a resume tailored to one job post: matched skills first, the most relevant
// experience bullets and projects on top, and a summary aimed at the role.
import type { Profile } from "@/lib/profile";
import { canonicalSkill, keywordHits, matchJob } from "@/lib/skills";

export type TailoredResume = Profile & {
  targetRole: string;
  matchedSkills: string[];
  otherSkills: string[];
  score: number;
};

export function defaultSummary(p: Profile, targetRole: string, matched: string[]) {
  const role = p.headline || targetRole || "Professional";
  const years = p.yearsExperience > 0 ? ` with ${p.yearsExperience}+ year${p.yearsExperience === 1 ? "" : "s"} of experience` : "";
  const focus = matched.length ? ` in ${listJoin(matched.slice(0, 5))}` : "";
  const target = targetRole ? ` Looking to contribute as a ${targetRole}.` : "";
  const own = p.summary ? ` ${p.summary.trim()}` : "";
  return `${role}${years}${focus}.${own}${target}`.replace(/\.\./g, ".");
}

export function tailorResume(p: Profile, job: { content: string; jobTitle: string }, aiSummary?: string): TailoredResume {
  const { score, matched } = matchJob(job.content, p.skills);
  const allSkills = [...new Set(p.skills.map(canonicalSkill))];
  const keywords = matched.length ? matched : allSkills;

  const experience = p.experience.map((e) => ({
    ...e,
    bullets: [...e.bullets].sort((a, b) => keywordHits(b, keywords) - keywordHits(a, keywords)),
  }));
  const projects = [...p.projects].sort(
    (a, b) => keywordHits(`${b.description} ${b.tech}`, keywords) - keywordHits(`${a.description} ${a.tech}`, keywords),
  );

  return {
    ...p,
    summary: aiSummary || defaultSummary(p, job.jobTitle, matched),
    experience,
    projects,
    targetRole: job.jobTitle,
    matchedSkills: matched,
    otherSkills: allSkills.filter((s) => !matched.includes(s)),
    score,
  };
}

export function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
