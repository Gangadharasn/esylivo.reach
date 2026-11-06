import { splitList } from "@/lib/profile";

const MAX_KEYWORDS = 5;

type Source = { jobKeywords: string; headline: string; skills: string };

/**
 * What to search for: the user's own job keywords, or ones built from the profile
 * headline and top skills. Each job site phrases these in its own way (lib/sources.ts).
 */
export function searchKeywords(user: Source) {
  let base = splitList(user.jobKeywords);
  if (!base.length) {
    const skills = splitList(user.skills);
    base = [user.headline.trim(), skills.slice(0, 2).join(" "), skills.slice(2, 4).join(" ")].filter((q) => q.trim().length > 1);
  }
  return [...new Set(base)].slice(0, MAX_KEYWORDS);
}
