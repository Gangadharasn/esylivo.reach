import "server-only";

import { runActor, type ParsedPost } from "@/lib/apify";
import { chargeSearch } from "@/lib/credits";
import { autoSend } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";
import { splitList } from "@/lib/profile";
import { affordablePerKeyword, apifyCost, formatCredits, maxSearchCostMicros } from "@/lib/pricing";
import { searchKeywords } from "@/lib/queries";
import { matchJob } from "@/lib/skills";
import { parseSources, SOURCES, sourceLabel } from "@/lib/sources";
import { timeAgo } from "@/lib/utils";

export { searchKeywords };

type User = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

/** How often the automatic search runs per user (on login/page visits and from the cron). */
export const AUTO_SEARCH_HOURS = 12;
// A search still marked "running" after this long is treated as crashed.
const STALE_RUN_MS = 10 * 60 * 1000;

/** The app's own Apify token. Server-side only; users never see or configure it. */
export function searchAvailable() {
  return Boolean(process.env.APIFY_TOKEN);
}

/** Saves posts, keeping the status of ones already seen. Returns ids of posts that were new. */
export async function savePosts(userId: string, posts: ParsedPost[]) {
  const newIds: string[] = [];
  for (const p of posts) {
    const existing = await prisma.jobPost.findUnique({ where: { userId_externalId: { userId, externalId: p.externalId } }, select: { id: true } });
    if (existing) {
      await prisma.jobPost.update({ where: { id: existing.id }, data: { ...p } });
    } else {
      const created = await prisma.jobPost.create({ data: { ...p, userId } });
      newIds.push(created.id);
    }
  }
  return newIds;
}

const OUT_OF_CREDITS = "You're out of credits. Upgrade to Pro to keep finding jobs.";

/** How many results per keyword the user's balance pays for (0 = can't afford a search). */
export function affordableResults(user: User) {
  const pricings = parseSources(user.jobSources).map((k) => SOURCES[k].pricing);
  return affordablePerKeyword(user.creditMicros, pricings, searchKeywords(user).length, user.postsPerQuery);
}

/** Worst-case credit cost of the user's search settings, for showing before they search. */
export function searchCostEstimate(user: Pick<User, "jobSources" | "jobKeywords" | "headline" | "skills" | "postsPerQuery">) {
  const pricings = parseSources(user.jobSources).map((k) => SOURCES[k].pricing);
  return maxSearchCostMicros(pricings, Math.max(1, searchKeywords(user).length), user.postsPerQuery);
}

export function autoSearchDue(user: User, now = new Date()) {
  if (!user.autoSearch || !searchAvailable() || !searchKeywords(user).length || !parseSources(user.jobSources).length) return false;
  if (!affordableResults(user)) return false;
  if (user.searchStatus === "running" && user.searchStartedAt && now.getTime() - user.searchStartedAt.getTime() < STALE_RUN_MS) return false;
  return !user.lastSearchAt || now.getTime() - user.lastSearchAt.getTime() >= AUTO_SEARCH_HOURS * 3600_000;
}

/**
 * Marks the user's search as running. Returns false if another search is already
 * in progress, so page loads, the cron and the button never run two at once.
 */
export async function claimSearch(userId: string) {
  const now = new Date();
  const { count } = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ searchStatus: { not: "running" } }, { searchStartedAt: null }, { searchStartedAt: { lt: new Date(now.getTime() - STALE_RUN_MS) } }],
    },
    data: { searchStatus: "running", searchStartedAt: now, searchError: "" },
  });
  return count === 1;
}

/** Runs a claimed search to completion, then auto-applies if the user turned that on. */
export async function runSearch(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  try {
    const keywords = searchKeywords(user);
    if (!keywords.length) throw new Error("Add job keywords or a headline and skills to your profile so we know what to search for.");
    const sources = parseSources(user.jobSources);
    if (!sources.length) throw new Error("Choose at least one job site to search.");
    if (!searchAvailable()) throw new Error("Job search is temporarily unavailable. Please try again later.");
    // Fewer results per keyword when the balance is low, so a search never costs more than the user has.
    const perKeyword = affordableResults(user);
    if (!perKeyword) throw new Error(OUT_OF_CREDITS);

    // All job sites at once; one site failing doesn't lose the others' results.
    const prefs = { keywords, location: user.jobLocation, postedLimit: user.postedLimit, perKeyword, jobsOnly: user.jobsOnly };
    const skills = splitList(user.skills);
    const results = await Promise.allSettled(
      sources.map(async (key) => {
        const source = SOURCES[key];
        const items = await runActor(source.actor, process.env.APIFY_TOKEN!, source.input(prefs));
        return { raw: items.length, posts: source.parse(items, skills) };
      }),
    );
    const failed = sources.filter((_, i) => results[i].status === "rejected");
    results.forEach((r, i) => r.status === "rejected" && console.error(`[search] ${sources[i]} failed for`, userId, r.reason));

    // Apify bills per result returned (parsed or not) plus a fee per run, failed runs included.
    const apifyUsd = sources.reduce((sum, key, i) => {
      const r = results[i];
      return sum + apifyCost(SOURCES[key].pricing, r.status === "fulfilled" ? r.value.raw : 0);
    }, 0);
    const posts = results.flatMap((r) => (r.status === "fulfilled" ? r.value.posts : []));
    const charged = await chargeSearch(
      user.id,
      apifyUsd,
      `Job search on ${sources.map(sourceLabel).join(", ")}: ${posts.length} jobs (${keywords.join(", ")})`,
    );
    console.log(`[search] ${userId}: ${posts.length} jobs, Apify ~$${apifyUsd.toFixed(3)}, charged ${formatCredits(charged)}`);
    if (failed.length === sources.length) throw (results[0] as PromiseRejectedResult).reason;

    const newIds = await savePosts(user.id, posts);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        searchStatus: "idle",
        searchError: failed.length ? `${failed.map(sourceLabel).join(", ")} couldn't be searched this time; showing results from the other sites.` : "",
        lastSearchAt: new Date(),
        lastSearchFound: posts.length,
        lastSearchNew: newIds.length,
      },
    });
    if (user.autoSend && newIds.length) await autoSend(user, newIds);
  } catch (err) {
    console.error("[search] failed for", userId, err);
    const message = err instanceof Error ? err.message : "Search failed.";
    await prisma.user.update({
      where: { id: userId },
      // Count a failed run as a search so the next automatic retry waits a full interval.
      data: { searchStatus: "error", searchError: friendly(message), lastSearchAt: new Date() },
    });
  }
}

// Provider errors (Apify token or account credit) are the app's problem, not the user's.
function friendly(message: string) {
  return /apify/i.test(message) ? "Job search is temporarily unavailable. Please try again later." : message;
}

/** Props for the <SearchStatus> banner. */
export function searchStatusProps(user: User, now = new Date()) {
  const next = user.lastSearchAt ? user.lastSearchAt.getTime() + AUTO_SEARCH_HOURS * 3600_000 - now.getTime() : null;
  return {
    // A due search is being started by the layout during this same request.
    status: autoSearchDue(user, now) ? "running" : user.searchStatus,
    error: user.searchError,
    lastSearch: user.lastSearchAt ? timeAgo(user.lastSearchAt, now) : null,
    found: user.lastSearchFound,
    added: user.lastSearchNew,
    queries: searchKeywords(user),
    sources: parseSources(user.jobSources).map(sourceLabel),
    autoSearch: user.autoSearch,
    credits: formatCredits(user.creditMicros),
    outOfCredits: !affordableResults(user),
    nextIn: next === null ? null : next <= 0 ? "on your next visit" : `in about ${Math.max(1, Math.round(next / 3600_000))}h`,
  };
}

/** Recomputes match scores after the user's skills change. */
export async function rescorePosts(userId: string, skills: string[]) {
  const posts = await prisma.jobPost.findMany({ where: { userId }, select: { id: true, content: true }, take: 3000 });
  for (const p of posts) {
    const { score, matched } = matchJob(p.content, skills);
    await prisma.jobPost.update({ where: { id: p.id }, data: { matchScore: score, matchedSkills: matched.join(",") } });
  }
}
