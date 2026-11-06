"use client";

import { Briefcase, ExternalLink, IndianRupee, Loader2, Mail, MapPin, Phone, Send, SkipForward, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Avatar, MatchBadge, SourceBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui";
import { sourceLabel } from "@/lib/sources";
import { cn } from "@/lib/utils";

import { bulkSendAction, deletePostsAction, markAppliedOnSiteAction, sendAction, setStatusAction } from "./actions";

export type JobRow = {
  id: string;
  source: string;
  url: string;
  applyUrl: string;
  location: string;
  experience: string;
  salary: string;
  content: string;
  authorName: string;
  authorHeadline: string;
  authorUrl: string;
  authorAvatar: string;
  postedAgo: string;
  jobTitle: string;
  emails: string[];
  phones: string[];
  matchedSkills: string[];
  matchScore: number;
  status: string;
};

export function JobsTable({ rows, canSend }: { rows: JobRow[]; canSend: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const sendable = rows.filter((r) => r.emails.length && r.status !== "SENT" && r.status !== "APPLIED");
  const allSelected = sendable.length > 0 && sendable.every((r) => selected.has(r.id));
  const ids = [...selected];
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sendable.map((r) => r.id)));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function sendOne(row: JobRow) {
    setBusyId(row.id);
    setNotice(null);
    start(async () => {
      const result = await sendAction(row.id);
      setBusyId(null);
      setNotice(result.ok ? { tone: "ok", text: `Application sent to ${row.emails[0]}.` } : { tone: "error", text: result.error });
    });
  }

  /** Job sites have no apply API: open the listing for the user to apply, and record it. */
  function applyOnSite(row: JobRow) {
    window.open(row.applyUrl || row.url, "_blank", "noopener");
    setNotice({ tone: "ok", text: `Opened ${sourceLabel(row.source)} so you can apply there. Marked as applied; use "Mark new" if you didn't.` });
    start(() => markAppliedOnSiteAction(row.id));
  }

  function bulk(kind: "send" | "skip" | "restore" | "delete") {
    setNotice(null);
    start(async () => {
      if (kind === "send") {
        const { sent, errors } = await bulkSendAction(ids);
        setNotice({
          tone: errors.length && !sent ? "error" : "ok",
          text: `Sent ${sent} application${sent === 1 ? "" : "s"}.${errors.length ? ` ${errors.length} not sent: ${errors.slice(0, 3).join(" · ")}` : ""}`,
        });
      } else if (kind === "delete") {
        await deletePostsAction(ids);
      } else {
        await setStatusAction(ids, kind === "skip" ? "SKIPPED" : "NEW");
      }
      setSelected(new Set());
    });
  }

  if (!rows.length) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="font-medium text-slate-900">No jobs here yet</p>
        <p className="mt-1 text-sm text-slate-500">New jobs appear here after each automatic search. Try changing the filters.</p>
      </div>
    );
  }

  /** Apply-on-site, email and review buttons: compact in the table, full-width on cards. */
  const actions = (r: JobRow, size: "sm" | "lg") => {
    const btn = size === "sm" ? "px-3 py-1.5 text-xs" : "flex-1 py-2.5";
    return (
      <>
        {r.source !== "LINKEDIN" && (r.applyUrl || r.url) && r.status !== "APPLIED" ? (
          <Button variant="secondary" className={btn} onClick={() => applyOnSite(r)} title={`Opens the job on ${sourceLabel(r.source)}`}>
            <ExternalLink className="size-3.5" /> {size === "lg" ? `Apply on ${sourceLabel(r.source)}` : sourceLabel(r.source)}
          </Button>
        ) : null}
        {r.emails.length && r.status !== "SENT" ? (
          <Button
            variant="gradient"
            className={btn}
            disabled={!canSend || pending}
            onClick={() => sendOne(r)}
            title={canSend ? "" : "Connect your email in Settings"}
          >
            {busyId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} {size === "lg" ? "Email resume" : "Email"}
          </Button>
        ) : null}
        <Link
          href={`/jobs/${r.id}`}
          className={cn(
            "rounded-lg text-center font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
          )}
        >
          Review
        </Link>
      </>
    );
  };

  const facts = (r: JobRow) =>
    r.experience || r.salary || r.location ? (
      <p className="mb-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
        {r.experience ? (
          <span className="flex items-center gap-1">
            <Briefcase className="size-3" /> {r.experience}
          </span>
        ) : null}
        {r.salary ? (
          <span className="flex items-center gap-1">
            <IndianRupee className="size-3" /> {r.salary.replace(/^₹\s?/, "")}
          </span>
        ) : null}
        {r.location ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-3" /> {r.location}
          </span>
        ) : null}
      </p>
    ) : null;

  const description = (r: JobRow) => {
    const open = expanded === r.id;
    return (
      <>
        <p className={cn("whitespace-pre-line text-sm text-slate-600", !open && "line-clamp-3")}>{r.content}</p>
        <div className="mt-1 flex gap-3 text-xs">
          <button type="button" className="py-1 font-medium text-brand-600 hover:underline" onClick={() => setExpanded(open ? null : r.id)}>
            {open ? "Show less" : "Read more"}
          </button>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 py-1 text-slate-500 hover:text-slate-800">
              {sourceLabel(r.source)} <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </>
    );
  };

  return (
    <div>
      {selected.size ? (
        <div
          className={cn(
            "z-30 flex flex-wrap items-center gap-2 border-brand-100 bg-brand-50/95 px-4 py-2.5 backdrop-blur",
            // Phones: floating bar above the bottom tabs. Larger screens: sticky strip on top of the list.
            "max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-md:rounded-2xl max-md:border max-md:shadow-xl",
            "md:sticky md:top-0 md:border-b",
          )}
        >
          <span className="mr-auto text-sm font-medium text-brand-900 md:mr-2">{selected.size} selected</span>
          <Button variant="gradient" className="py-1.5" disabled={pending || !canSend} onClick={() => bulk("send")}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="max-sm:hidden">Send tailored resumes</span>
            <span className="sm:hidden">Send</span>
          </Button>
          <Button variant="secondary" className="py-1.5" disabled={pending} onClick={() => bulk("skip")} aria-label="Skip">
            <SkipForward className="size-4" /> <span className="max-sm:hidden">Skip</span>
          </Button>
          <Button variant="secondary" className="py-1.5" disabled={pending} onClick={() => bulk("restore")} aria-label="Mark new">
            <Undo2 className="size-4" /> <span className="max-sm:hidden">Mark new</span>
          </Button>
          <Button variant="ghost" className="py-1.5 text-red-600" disabled={pending} onClick={() => bulk("delete")} aria-label="Delete">
            <Trash2 className="size-4" /> <span className="max-sm:hidden">Delete</span>
          </Button>
        </div>
      ) : null}
      {notice ? (
        <p className={cn("border-b px-4 py-2.5 text-sm", notice.tone === "ok" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-red-100 bg-red-50 text-red-700")}>
          {notice.text}
        </p>
      ) : null}

      {/* Phones and tablets: one card per job. */}
      <div className="xl:hidden">
        {sendable.length ? (
          <label className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            <input type="checkbox" className="size-5 rounded" checked={allSelected} onChange={toggleAll} />
            Select all {sendable.length} with an email
          </label>
        ) : null}
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className={cn("px-4 py-4", selected.has(r.id) && "bg-brand-50/50")}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${r.authorName}`}
                  className="mt-2.5 size-5 shrink-0 rounded"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <Avatar name={r.authorName} src={r.authorAvatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{r.authorName || "Unknown"}</p>
                      {r.authorHeadline ? <p className="line-clamp-1 text-xs text-slate-500">{r.authorHeadline}</p> : null}
                    </div>
                    <MatchBadge score={r.matchScore} />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <SourceBadge source={r.source} /> {r.postedAgo}
                    {r.status !== "NEW" ? <StatusBadge status={r.status} /> : null}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {r.jobTitle ? <p className="font-semibold leading-snug text-slate-900">{r.jobTitle}</p> : null}
                {facts(r)}
                {description(r)}
              </div>

              {r.emails.length || r.phones.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.emails.map((e) => (
                    <a key={e} href={`mailto:${e}`} className="flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
                      <Mail className="size-3.5 shrink-0 text-slate-400" /> <span className="truncate">{e}</span>
                    </a>
                  ))}
                  {r.phones.map((p) => (
                    <a key={p} href={`tel:${p}`} className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      <Phone className="size-3.5 shrink-0" /> {p}
                    </a>
                  ))}
                </div>
              ) : null}

              {r.matchedSkills.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.matchedSkills.slice(0, 6).map((sk) => (
                    <span key={sk} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">{actions(r, "lg")}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Wide screens: table. */}
      <div className="hidden xl:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" aria-label="Select all with email" className="size-4 rounded" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-3 py-3 font-medium">Posted by</th>
              <th className="px-3 py-3 font-medium">Job description</th>
              <th className="px-3 py-3 font-medium">Contact</th>
              <th className="px-3 py-3 font-medium">Match</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className={cn("align-top hover:bg-slate-50/70", selected.has(r.id) && "bg-brand-50/40")}>
                <td className="px-4 py-4">
                  <input type="checkbox" aria-label={`Select ${r.authorName}`} className="size-4 rounded" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td className="w-56 px-3 py-4">
                  <div className="flex gap-3">
                    <Avatar name={r.authorName} src={r.authorAvatar} />
                    <div className="min-w-0">
                      {r.authorUrl ? (
                        <a href={r.authorUrl} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-brand-600">
                          {r.authorName || "Unknown"}
                        </a>
                      ) : (
                        <p className="font-medium text-slate-900">{r.authorName || "Unknown"}</p>
                      )}
                      <p className="line-clamp-2 text-xs text-slate-500">{r.authorHeadline}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <SourceBadge source={r.source} /> {r.postedAgo}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4">
                  {r.jobTitle ? <p className="font-semibold text-slate-900">{r.jobTitle}</p> : null}
                  {facts(r)}
                  {description(r)}
                </td>
                <td className="w-56 px-3 py-4">
                  {r.emails.length || r.phones.length ? (
                    <div className="space-y-1">
                      {r.emails.map((e) => (
                        <a key={e} href={`mailto:${e}`} className="flex items-center gap-1.5 break-all text-slate-700 hover:text-brand-600">
                          <Mail className="size-3.5 shrink-0 text-slate-400" /> {e}
                        </a>
                      ))}
                      {r.phones.map((p) => (
                        <a key={p} href={`tel:${p}`} className="flex items-center gap-1.5 text-slate-700 hover:text-brand-600">
                          <Phone className="size-3.5 shrink-0 text-slate-400" /> {p}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{r.source === "LINKEDIN" ? "No contact in post" : `Apply on ${sourceLabel(r.source)}`}</span>
                  )}
                </td>
                <td className="w-36 px-3 py-4">
                  <MatchBadge score={r.matchScore} />
                  {r.matchedSkills.length ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{r.matchedSkills.slice(0, 5).join(" · ")}</p> : null}
                </td>
                <td className="px-3 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="w-32 px-3 py-4">
                  <div className="flex flex-col items-stretch gap-1.5">{actions(r, "sm")}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
