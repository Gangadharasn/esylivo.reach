// The job sources Esylivo Reach searches. Each one knows how to build its Apify actor's
// input from the user's keywords and how to turn the actor's results into job rows.
import type { SourcePricing } from "@/lib/pricing";
import { asList, finishPost, htmlToText, isRecord, parsePosts, POSTED_DAYS, relativeDate, str, toDate, type ParsedPost } from "@/lib/apify";

export const SOURCE_KEYS = ["LINKEDIN", "NAUKRI", "INDEED", "FOUNDIT"] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export type SearchPrefs = { keywords: string[]; location: string; postedLimit: string; perKeyword: number; jobsOnly: boolean };

type Source = {
  key: SourceKey;
  label: string;
  actor: string;
  /** Tailwind classes for the source badge. */
  badge: string;
  /** Apify's charges for this actor, used to bill credits (see lib/pricing.ts). */
  pricing: SourcePricing;
  input: (p: SearchPrefs) => unknown;
  parse: (items: unknown, skills: string[]) => ParsedPost[];
};

const HIRING_WORDS = /\b(hiring|looking for|opening|vacancy|vacancies|job|jobs|requirement)\b/i;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** LinkedIn search works best phrased like a hiring post: "hiring react developer bengaluru". */
export function linkedinQueries(p: Pick<SearchPrefs, "keywords" | "location">) {
  const location = p.location.trim();
  return [
    ...new Set(
      p.keywords.map((k) => {
        const withIntent = HIRING_WORDS.test(k) ? k : `hiring ${k}`;
        return location && !k.toLowerCase().includes(location.toLowerCase()) ? `${withIntent} ${location}` : withIntent;
      }),
    ),
  ];
}

/** e.g. https://www.naukri.com/react-developer-jobs-in-bengaluru?k=react%20developer&l=bengaluru&jobAge=7 */
export function naukriSearchUrl(keyword: string, location: string, days: number) {
  const path = `${slug(keyword)}-jobs${location ? `-in-${slug(location)}` : ""}`;
  const params = new URLSearchParams({ k: keyword, ...(location ? { l: location.toLowerCase() } : {}), jobAge: String(Math.min(days, 30)) });
  return `https://www.naukri.com/${path}?${params}`;
}

/** Indeed only offers 1, 3, 7 and 14-day freshness filters. */
export function indeedSearchUrl(keyword: string, location: string, days: number) {
  const fromage = [1, 3, 7, 14].find((d) => d >= days) ?? 14;
  const params = new URLSearchParams({ q: keyword, ...(location ? { l: location } : {}), fromage: String(fromage), sort: "date" });
  return `https://in.indeed.com/jobs?${params}`;
}

const FOUNDIT_DAYS = [1, 3, 7, 15, 30];

export const SOURCES: Record<SourceKey, Source> = {
  LINKEDIN: {
    key: "LINKEDIN",
    label: "LinkedIn",
    actor: "harvestapi~linkedin-post-search",
    badge: "bg-[#0a66c2]/10 text-[#0a66c2] ring-[#0a66c2]/20",
    // $0.002/post, $0.001 per query with no results, $0.00005 per start.
    pricing: { perResult: 0.002, perRun: 0.005 },
    input: (p) => ({
      searchQueries: linkedinQueries(p),
      maxPosts: p.perKeyword,
      postedLimit: p.postedLimit,
      sortBy: "date",
      ...(p.jobsOnly ? { contentType: "jobs" } : {}),
      profileScraperMode: "short",
    }),
    parse: parsePosts,
  },

  NAUKRI: {
    key: "NAUKRI",
    label: "Naukri",
    actor: "easyapi~naukri-jobs-scraper",
    badge: "bg-[#275df5]/10 text-[#275df5] ring-[#275df5]/20",
    // $0.00499/job + $0.09 per start, and we also pay this actor's compute and proxy (~$0.06/run).
    pricing: { perResult: 0.005, perRun: 0.15 },
    input: (p) => ({
      searchUrls: p.keywords.map((k) => naukriSearchUrl(k, p.location.trim(), POSTED_DAYS[p.postedLimit] ?? 7)),
      maxItems: p.perKeyword * p.keywords.length,
      proxyConfiguration: { useApifyProxy: true },
    }),
    parse: (items, skills) =>
      asList(items).flatMap((raw) => {
        if (!isRecord(raw)) return [];
        const id = str(raw.jobId);
        const title = str(raw.title);
        if (!id || !title) return [];
        const placeholders = Array.isArray(raw.placeholders) ? raw.placeholders.filter(isRecord) : [];
        const fact = (type: string) => str(placeholders.find((x) => x.type === type)?.label);
        const jd = str(raw.jdURL);
        const url = jd ? (jd.startsWith("http") ? jd : `https://www.naukri.com${jd.startsWith("/") ? "" : "/"}${jd}`) : "";
        const tags = str(raw.tagsAndSkills);
        const content = htmlToText(raw.jobDescription) || [title, tags].filter(Boolean).join("\n");
        const company = str(raw.companyName);
        const location = fact("location");
        const experience = fact("experience");
        const salary = fact("salary").replace(/^not disclosed$/i, "");
        return [
          finishPost(
            {
              source: "NAUKRI",
              externalId: `naukri:${id}`,
              url,
              applyUrl: url,
              content,
              jobTitle: title,
              authorName: company,
              authorHeadline: [location, experience].filter(Boolean).join(" · "),
              authorAvatar: str(raw.logoPathV3) || str(raw.logoPath),
              company,
              location,
              experience,
              salary,
              postedAt: toDate(raw.createdDate) ?? relativeDate(raw.footerPlaceholderLabel),
            },
            skills,
            `${content}\n${tags}`,
          ),
        ];
      }),
  },

  INDEED: {
    key: "INDEED",
    label: "Indeed",
    actor: "misceres~indeed-scraper",
    badge: "bg-[#2557a7]/10 text-[#2557a7] ring-[#2557a7]/20",
    // $0.006/job on Apify's free plan (cheaper on paid plans).
    pricing: { perResult: 0.006, perRun: 0.01 },
    input: (p) => ({
      country: "IN",
      startUrls: p.keywords.map((k) => ({ url: indeedSearchUrl(k, p.location.trim(), POSTED_DAYS[p.postedLimit] ?? 7) })),
      maxItemsPerSearch: p.perKeyword,
      saveOnlyUniqueItems: true,
      parseCompanyDetails: false,
    }),
    parse: (items, skills) =>
      asList(items).flatMap((raw) => {
        if (!isRecord(raw)) return [];
        const id = str(raw.id);
        const title = str(raw.positionName);
        if (!id || !title) return [];
        const url = str(raw.url);
        const company = str(raw.company);
        const location = str(raw.location);
        const jobType = Array.isArray(raw.jobType) ? raw.jobType.map(str).filter(Boolean).join(", ") : "";
        const content = htmlToText(raw.description) || title;
        return [
          finishPost(
            {
              source: "INDEED",
              externalId: `indeed:${id}`,
              url,
              applyUrl: str(raw.externalApplyLink) || url,
              content,
              jobTitle: title,
              authorName: company,
              authorHeadline: [location, jobType].filter(Boolean).join(" · "),
              authorAvatar: str(raw.companyLogo),
              company,
              location,
              salary: str(raw.salary),
              postedAt: toDate(raw.postingDateParsed) ?? relativeDate(raw.postedAt),
            },
            skills,
          ),
        ];
      }),
  },

  FOUNDIT: {
    key: "FOUNDIT",
    label: "Foundit",
    actor: "themineworks~foundit-jobs-scraper",
    badge: "bg-[#6e00be]/10 text-[#6e00be] ring-[#6e00be]/20",
    // $0.0025/job on Apify's free plan.
    pricing: { perResult: 0.0025, perRun: 0.01 },
    input: (p) => ({
      searchKeywords: p.keywords,
      ...(p.location.trim() ? { location: p.location.trim() } : {}),
      postedWithinDays: String(FOUNDIT_DAYS.find((d) => d >= (POSTED_DAYS[p.postedLimit] ?? 7)) ?? 30),
      maxJobs: p.perKeyword * p.keywords.length,
      includeJobDescription: true,
    }),
    parse: (items, skills) =>
      asList(items).flatMap((raw) => {
        if (!isRecord(raw) || raw._type === "summary") return [];
        const id = str(raw.job_id);
        const title = str(raw.title);
        if (!id || !title) return [];
        const url = str(raw.apply_url);
        const company = str(raw.company);
        const location = str(raw.location);
        const skillList = Array.isArray(raw.skills) ? raw.skills.map(str).filter(Boolean) : [];
        const minExp = raw.experience_min_years;
        const maxExp = raw.experience_max_years;
        const experience = typeof minExp === "number" ? `${minExp}${typeof maxExp === "number" ? `-${maxExp}` : "+"} Yrs` : "";
        const salary =
          typeof raw.salary_min_lakhs === "number" ? `₹${raw.salary_min_lakhs}${typeof raw.salary_max_lakhs === "number" ? `-${raw.salary_max_lakhs}` : "+"} LPA` : "";
        const description = htmlToText(raw.description ?? raw.job_description ?? raw.jobDescription);
        const content = description || [title, company, skillList.length ? `Skills: ${skillList.join(", ")}` : ""].filter(Boolean).join("\n");
        const days = typeof raw.posted_days_ago === "number" ? raw.posted_days_ago : null;
        return [
          finishPost(
            {
              source: "FOUNDIT",
              externalId: `foundit:${id}`,
              url,
              applyUrl: url,
              content,
              jobTitle: title,
              authorName: company,
              authorHeadline: [location, experience].filter(Boolean).join(" · "),
              company,
              location,
              experience,
              salary,
              postedAt: days !== null ? new Date(Date.now() - days * 86_400_000) : relativeDate(raw.posted_date_text),
            },
            skills,
            `${content}\n${skillList.join(", ")}`,
          ),
        ];
      }),
  },
};

export function parseSources(value: string): SourceKey[] {
  const keys = value
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is SourceKey => (SOURCE_KEYS as readonly string[]).includes(s));
  return [...new Set(keys)];
}

export function sourceLabel(key: string) {
  return SOURCES[key as SourceKey]?.label ?? key;
}
