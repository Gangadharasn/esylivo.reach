"use client";

import { AlertTriangle, CheckCircle2, FileSearch, FileUp, Loader2, ScanText, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Card, CardHeader, Field, FormError, Select, Textarea } from "@/components/ui";
import type { AtsCheck, AtsResult } from "@/lib/ats";
import { RESUME_TEMPLATES } from "@/lib/resume-templates";
import { cn } from "@/lib/utils";

import { runAtsAction } from "./actions";

type Job = { id: string; label: string };

export function AtsChecker({ jobs, defaultJob, template }: { jobs: Job[]; defaultJob: string; template: string }) {
  const [state, action] = useActionState(runAtsAction, undefined);
  const [source, setSource] = useState<"mine" | "upload">("mine");
  const [jobId, setJobId] = useState(defaultJob || (jobs[0]?.id ?? "none"));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="h-fit lg:sticky lg:top-6 lg:col-span-2">
        <CardHeader title="Check a resume" description="See your resume the way applicant tracking systems read and rank it." />
        <form action={action} className="space-y-5 p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Resume</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["mine", "My Esylivo resume", FileSearch],
                  ["upload", "Upload a PDF", FileUp],
                ] as const
              ).map(([key, label, Icon]) => (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center text-sm ring-1",
                    source === key ? "bg-brand-50 font-medium text-brand-800 ring-2 ring-brand-400" : "text-slate-600 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  <input type="radio" name="source" value={key} checked={source === key} onChange={() => setSource(key)} className="sr-only" />
                  <Icon className="size-5" />
                  {label}
                </label>
              ))}
            </div>
            {source === "mine" ? (
              <div className="mt-3">
                <Field label="Template" htmlFor="template">
                  <Select id="template" name="template" defaultValue={template}>
                    {RESUME_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : (
              <input
                type="file"
                name="file"
                accept="application/pdf,.pdf"
                className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
              />
            )}
          </fieldset>

          <Field label="Compare with job" htmlFor="jobId" hint="Keyword match is the biggest factor in ATS ranking.">
            <Select id="jobId" name="jobId" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.length ? (
                <optgroup label="Your jobs (best matches first)">
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value="paste">Paste a job description…</option>
              <option value="none">No job: general check only</option>
            </Select>
          </Field>
          {jobId === "paste" ? <Textarea name="jd" className="min-h-40" placeholder="Paste the full job description here" /> : null}

          <FormError message={state?.error} />
          <RunButton />
        </form>
      </Card>

      <div className="lg:col-span-3">{state?.result ? <Results state={state} /> : <EmptyState />}</div>
    </div>
  );
}

function RunButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" className="w-full py-2.5" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ScanText className="size-4" />} {pending ? "Scanning…" : "Run ATS check"}
    </Button>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-fuchsia-600 text-white shadow-lg">
        <ScanText className="size-7" />
      </span>
      <p className="mt-4 font-semibold text-slate-900">Your ATS score appears here</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        We read the PDF like an applicant tracking system does, then score keyword match, readability, contact details, sections and content.
      </p>
    </Card>
  );
}

const TONE = (score: number) => (score >= 80 ? "#10b981" : score >= 65 ? "#7c3aed" : score >= 50 ? "#f59e0b" : "#ef4444");

function Results({ state }: { state: NonNullable<Awaited<ReturnType<typeof runAtsAction>>> }) {
  const r = state.result!;
  const color = TONE(r.score);
  const fails = r.checks.filter((c) => c.status !== "pass");
  const passes = r.checks.filter((c) => c.status === "pass");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <div
            className="relative flex size-36 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${color} ${r.score * 3.6}deg, #eef2f7 0deg)` }}
            role="img"
            aria-label={`ATS score ${r.score} out of 100`}
          >
            <div className="flex size-28 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-4xl font-bold tabular-nums" style={{ color }}>
                {r.score}
              </span>
              <span className="text-xs text-slate-500">out of 100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm text-slate-500">ATS score</p>
            <p className="text-2xl font-semibold" style={{ color }}>
              {r.grade}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {state.resumeLabel}
              {state.jobLabel ? ` vs. ${state.jobLabel}` : ""}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {r.stats.pages} page{r.stats.pages === 1 ? "" : "s"} · {r.stats.words} words · {r.stats.bullets} bullets · {r.stats.quantified} with numbers
            </p>
          </div>
        </div>
        <div className="space-y-3 border-t border-slate-100 p-6">
          {r.categories.map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-700">
                  {c.label} <span className="text-xs text-slate-400">· {c.weight}% of score</span>
                </span>
                <span className="font-semibold tabular-nums" style={{ color: TONE(c.score) }}>
                  {c.score}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full transition-all" style={{ width: `${c.score}%`, background: TONE(c.score) }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {r.keywords ? (
        <Card>
          <CardHeader title="Keywords from the job" description="ATS filters rank resumes by how many of the job's keywords they contain." />
          <div className="space-y-4 p-5">
            <KeywordList label="In your resume" items={r.keywords.matched} tone="ok" />
            <KeywordList label="Missing" items={r.keywords.missing} tone="missing" />
            {r.keywords.missing.length ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Only add skills you really have. Add them to <Link href="/profile" className="font-medium underline">your profile</Link> and every tailored
                resume will include them.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={fails.length ? `${fails.length} thing${fails.length === 1 ? "" : "s"} to improve` : "Nothing to fix"} />
        <ul className="divide-y divide-slate-100">
          {fails.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </ul>
        {passes.length ? (
          <details className="border-t border-slate-100">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-emerald-700">{passes.length} checks passed</summary>
            <ul className="divide-y divide-slate-100">
              {passes.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          </details>
        ) : null}
      </Card>

      <Card>
        <details>
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-medium text-slate-800">
            <Sparkles className="size-4 text-brand-500" /> See your resume the way an ATS reads it
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-slate-100 bg-slate-50 p-5 font-mono text-xs leading-relaxed text-slate-700">
            {state.parsedText || "(no text found)"}
          </pre>
        </details>
      </Card>
    </div>
  );
}

function KeywordList({ label, items, tone }: { label: string; items: string[]; tone: "ok" | "missing" }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} ({items.length})
      </p>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((k) => (
            <span
              key={k}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                tone === "ok" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200",
              )}
            >
              {tone === "ok" ? "✓ " : "+ "}
              {k}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">None</p>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: AtsCheck }) {
  const Icon = check.status === "pass" ? CheckCircle2 : check.status === "warn" ? AlertTriangle : XCircle;
  return (
    <li className="flex gap-3 px-5 py-3">
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", check.status === "pass" ? "text-emerald-500" : check.status === "warn" ? "text-amber-500" : "text-red-500")}
      />
      <div>
        <p className="text-sm font-medium text-slate-800">{check.label}</p>
        {check.tip ? <p className="mt-0.5 text-sm text-slate-500">{check.tip}</p> : null}
      </div>
    </li>
  );
}
