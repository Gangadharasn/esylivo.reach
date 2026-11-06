import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { autoSearchDue, claimSearch, runSearch } from "@/lib/search";

export const maxDuration = 300;

// Keeps every user's results fresh even when they don't log in: runs the automatic
// search (and auto-apply) for users whose last search is due.
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ where: { autoSearch: true }, orderBy: { lastSearchAt: "asc" }, take: 200 });
  const due = users.filter((u) => autoSearchDue(u));
  let ran = 0;
  const started = Date.now();
  for (const u of due) {
    if (Date.now() - started > 240_000) break; // leave the rest for the next run
    if (!(await claimSearch(u.id))) continue;
    await runSearch(u.id);
    ran++;
  }
  return NextResponse.json({ ok: true, due: due.length, ran });
}
