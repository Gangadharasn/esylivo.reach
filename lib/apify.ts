// Calls Apify actors and turns their results into job rows. One actor per job source:
//   LinkedIn  https://apify.com/harvestapi/linkedin-post-search
//   Naukri    https://apify.com/easyapi/naukri-jobs-scraper
//   Indeed    https://apify.com/misceres/indeed-scraper (country IN)
//   Foundit   https://apify.com/themineworks/foundit-jobs-scraper
import { extractEmails, extractJobTitle, extractPhones } from "@/lib/extract";
import { matchJob } from "@/lib/skills";

// Overridable so tests can point at a local stand-in for the Apify API.
const API_BASE = process.env.APIFY_API_BASE || "https://api.apify.com";

export const POSTED_LIMITS = ["24h", "week", "month", "3months"] as const;
export const POSTED_LABELS: Record<string, string> = {
  "24h": "Last 24 hours",
  week: "Last week",
  month: "Last month",
  "3months": "Last 3 months",
};

/** Posted-within window in days, for the job boards (which take day counts). */
export const POSTED_DAYS: Record<string, number> = { "24h": 1, week: 7, month: 30, "3months": 90 };

export async function runActor(actor: string, token: string, input: unknown): Promise<unknown[]> {
  const res = await fetch(`${API_BASE}/v2/acts/${actor}/run-sync-get-dataset-items?timeout=280&format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(300_000),
  });
  if (res.status === 401 || res.status === 403) throw new Error("Apify rejected the token.");
  if (res.status === 402) throw new Error("The Apify account is out of credit.");
  if (!res.ok) throw new Error(`Apify run of ${actor} failed (${res.status}).`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type ParsedPost = {
  source: string;
  externalId: string;
  url: string;
  applyUrl: string;
  content: string;
  authorName: string;
  authorHeadline: string;
  authorUrl: string;
  authorAvatar: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  postedAt: Date | null;
  jobTitle: string;
  emails: string;
  phones: string;
  matchedSkills: string;
  matchScore: number;
};

type Draft = Partial<ParsedPost> & Pick<ParsedPost, "source" | "externalId" | "content">;

/** Fills in contacts, role and match score from the text, plus empty defaults. */
export function finishPost(d: Draft, profileSkills: string[], matchText = d.content): ParsedPost {
  const { score, matched } = matchJob(`${d.jobTitle ?? ""}\n${matchText}`, profileSkills);
  return {
    url: "",
    applyUrl: "",
    authorName: "",
    authorHeadline: "",
    authorUrl: "",
    authorAvatar: "",
    company: "",
    location: "",
    experience: "",
    salary: "",
    postedAt: null,
    ...d,
    content: d.content.slice(0, 10_000),
    jobTitle: d.jobTitle || extractJobTitle(d.content),
    emails: extractEmails(d.content).join(","),
    phones: extractPhones(d.content).join(","),
    matchedSkills: matched.join(","),
    matchScore: score,
  };
}

type RawPost = {
  type?: string;
  id?: string | number;
  linkedinUrl?: string;
  url?: string;
  content?: string;
  text?: string;
  author?: { name?: string; info?: string; linkedinUrl?: string; avatar?: { url?: string } | null } | null;
  postedAt?: { date?: string; timestamp?: number } | string | null;
};

/** LinkedIn post search results -> rows. Accepts the dataset array or a wrapped export. */
export function parsePosts(items: unknown, profileSkills: string[]): ParsedPost[] {
  const out = new Map<string, ParsedPost>();
  for (const item of asList(items) as RawPost[]) {
    if (!isRecord(item) || (item.type && item.type !== "post")) continue;
    const content = String(item.content ?? item.text ?? "").trim();
    if (!content) continue;
    const url = String(item.linkedinUrl ?? item.url ?? "");
    const externalId = String(item.id ?? url ?? "") || hash(content);
    const posted = typeof item.postedAt === "string" ? item.postedAt : (item.postedAt?.date ?? item.postedAt?.timestamp);
    out.set(
      externalId,
      finishPost(
        {
          source: "LINKEDIN",
          externalId,
          url,
          content,
          authorName: item.author?.name ?? "",
          authorHeadline: item.author?.info ?? "",
          authorUrl: (item.author?.linkedinUrl ?? "").split("?")[0],
          authorAvatar: item.author?.avatar?.url ?? "",
          postedAt: toDate(posted),
        },
        profileSkills,
      ),
    );
  }
  return [...out.values()];
}

// ---------- helpers shared by the job-board parsers ----------

export function asList(items: unknown): unknown[] {
  return Array.isArray(items) ? items : isRecord(items) && Array.isArray(items.items) ? (items.items as unknown[]) : [];
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function toDate(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(typeof v === "string" && /^\d+$/.test(v) ? Number(v) : (v as string | number));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Just now", "Today", "3 days ago", "30+ Days Ago", "2 weeks ago" -> a date. */
export function relativeDate(text: unknown, now = new Date()): Date | null {
  if (typeof text !== "string" || !text.trim()) return null;
  if (/just|today|few hours|hour|minute|now/i.test(text) && !/\d+\s*day/i.test(text)) return now;
  const m = text.match(/(\d+)\+?\s*(day|week|month)/i);
  if (!m) return null;
  const days = Number(m[1]) * (/week/i.test(m[2]) ? 7 : /month/i.test(m[2]) ? 30 : 1);
  return new Date(now.getTime() - days * 86_400_000);
}

/** Job descriptions arrive as HTML from some boards; keep readable line breaks and bullets. */
export function htmlToText(html: unknown) {
  return String(html ?? "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `text-${(h >>> 0).toString(36)}`;
}
